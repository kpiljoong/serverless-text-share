import * as cdk from 'aws-cdk-lib';

import * as codecommit from 'aws-cdk-lib/aws-codecommit';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';

export class PipelineStack extends cdk.Stack {
    constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
        super(scope, id, props);
        
        const appRepo = new codecommit.Repository(this, 'AppRepo', {
            repositoryName: 'TextShareRepo'
        });
        
        // Source
        const sourceArtifact = new codepipeline.Artifact();
        const sourceAction = new codepipeline_actions.CodeCommitSourceAction({
            actionName: 'Source',
            repository: appRepo,
            output: sourceArtifact
        });
        
        // Build
        const cdkBuildSpec = codebuild.BuildSpec.fromObject({
            version: "0.2",
            phases: {
                install: {
                    'runtime-versions': { 'nodejs': '14' },
                    'commands': [ 'n 16', 'npm install' ]
                },
                build: {
                    commands: [ 
                        'npm run build',
                        'npm run cdk synth -- -o dist'
                    ]
                }
            },
            artifacts: {
                'base-directory': 'dist',
                'files': [ 'TextShareStack.template.json' ]
            }
        });
        
        const cdkBuildArtifact = new codepipeline.Artifact('CdkArtifact');
        const cdkBuildProject = new codebuild.PipelineProject(this, 'CdkBuildProject', {
            buildSpec: cdkBuildSpec
        });
        
        const cdkBuildAction = new codepipeline_actions.CodeBuildAction({
            actionName: 'CdkBuild',
            project: cdkBuildProject,
            input: sourceArtifact,
            outputs: [cdkBuildArtifact]
        });
        
        // Lambda App Build
        const lambdaAppBuildSpec = codebuild.BuildSpec.fromObject({
            version: "0.2",
            phases: {
            },
            artifacts: {
                'base-directory': 'lambda',
                'files': 'index.js'
            }
        });
        
        const lambdaAppBuildArtifact = new codepipeline.Artifact('LambdaAppArtifact');
        const lambdaAppBuildProject = new codebuild.PipelineProject(this, 'LambdaAppBuildProject', {
            buildSpec: lambdaAppBuildSpec
        });
        
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
            templatePath: cdkBuildArtifact.atPath('TextShareStack.template.json')
        });
        
        const pipeline = new codepipeline.Pipeline(this, 'Pipeline', {
            pipelineName: 'text-share-pipeline',
            stages: [
                { stageName: 'Source', actions: [sourceAction] },
                { stageName: 'Build', actions: [lambdaAppBuildAction, cdkBuildAction] },
                { stageName: 'Deploy', actions: [deployAction] }
            ]
        });
    }
}