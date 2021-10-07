import * as cdk from '@aws-cdk/core';

import * as codecommit from '@aws-cdk/aws-codecommit';
import * as codebuild from '@aws-cdk/aws-codebuild';
import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as codepipeline_actions from '@aws-cdk/aws-codepipeline-actions';

import * as lambda from '@aws-cdk/aws-lambda';

import * as s3 from '@aws-cdk/aws-s3';
import * as cloudformation from '@aws-cdk/aws-cloudformation';


export interface PipelineStackProps extends cdk.StackProps {
	readonly lambdaCode: lambda.CfnParametersCode;
}

export class PipelineStack extends cdk.Stack {
	constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
		super(scope, id, props);
		
		const appArtifactBucket = new s3.Bucket(this, 'TextShareAppBucket', {
            bucketName: 'text-share-app-bucket-pj' // 본인의 이니셜을 넣어 유니크하게 만듭니다
        });
		
		const appRepo = new codecommit.Repository(this, 'TextShareAppRepo', {
            repositoryName: 'TextShareAppRepo1'
        });
        
        // Source
        const sourceArtifact = new codepipeline.Artifact();
        const sourceAction = new codepipeline_actions.CodeCommitSourceAction({
            actionName: 'Source',
            repository: appRepo,
            output: sourceArtifact
        });
        
        // Build
        // const cdkBuildSpec = codebuild.BuildSpec.fromObject({
        //     version: "0.2",
        //     phases: {
        //         install: {
        //             'runtime-versions': { 'nodejs': '14' },
        //             'commands': [ 'npm install' ]
        //         },
        //         build: {
        //             commands: [ 
        //                 'npm run build',
        //                 'npm run cdk synth -- -o dist'
        //             ]
        //         }
        //     },
        //     artifacts: {
        //         'base-directory': 'dist',
        //         'files': [ 'TextShareStack.template.json' ]
        //     }
        // });
        
        // const cdkBuildArtifact = new codepipeline.Artifact('CdkArtifact');
        // const cdkBuildProject = new codebuild.PipelineProject(this, 'CdkBuildProject', {
        //     buildSpec: cdkBuildSpec
        // });
        
        // const cdkBuildAction = new codepipeline_actions.CodeBuildAction({
        //     actionName: 'CdkBuild',
        //     project: cdkBuildProject,
        //     input: sourceArtifact,
        //     outputs: [cdkBuildArtifact]
        // });
        
        // Lambda App Build
        const lambdaAppBuildSpec = codebuild.BuildSpec.fromObject({
            version: "0.2",
            phases: {
                install: {
                    'runtime-versions': { 'nodejs': '14' },
                    commands: [
                        'pip3 install --upgrade aws-sam-cli',
                        'sam --version',
                        'npm install'
                    ]
                },
                build: {
                    commands: [ 'sam build' ]
                },
                post_build: {
                    commands: [ 
                        'echo $PACKAGE_BUCKET',
                        'sam package --s3-bucket $PACKAGE_BUCKET --output-template-file packaged.yaml'
                    ]
                }
            },
            artifacts: {
                'discard-paths': 'yes',
                'files': 'packaged.yaml'
            }
        });
        
        const lambdaAppBuildArtifact = new codepipeline.Artifact('LambdaAppArtifact');
        const lambdaAppBuildProject = new codebuild.PipelineProject(this, 'LambdaAppBuildProject', {
            buildSpec: lambdaAppBuildSpec,
            environmentVariables: {
                PACKAGE_BUCKET: {
                    type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
                    value: appArtifactBucket.bucketName
                }
            }
        });
        appArtifactBucket.grantPut(lambdaAppBuildProject);
        
        const lambdaAppBuildAction = new codepipeline_actions.CodeBuildAction({
            actionName: 'LambdaAppBuild',
            project: lambdaAppBuildProject,
            input: sourceArtifact,
            outputs: [lambdaAppBuildArtifact]
        });
        
        // Deploy
        const deployAction = new codepipeline_actions.CloudFormationCreateUpdateStackAction({
            actionName: 'CfnDeploy',
            stackName: 'TextShareApp',
            adminPermissions: true,
            templatePath: lambdaAppBuildArtifact.atPath('packaged.yaml'),
            capabilities: [ 
                cloudformation.CloudFormationCapabilities.NAMED_IAM,
                cloudformation.CloudFormationCapabilities.ANONYMOUS_IAM,
                cloudformation.CloudFormationCapabilities.AUTO_EXPAND
            ]
        });
        
        const pipeline = new codepipeline.Pipeline(this, 'Pipeline', {
            pipelineName: 'text-share-pipeline',
            stages: [
                { stageName: 'Source', actions: [sourceAction] },
                { stageName: 'Build', actions: [lambdaAppBuildAction] },
                { stageName: 'Deploy', actions: [deployAction] }
            ]
        });
	}
}