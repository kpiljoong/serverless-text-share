import * as cdk from '@aws-cdk/core';

import * as codecommit from '@aws-cdk/aws-codecommit';
import * as codebuild from '@aws-cdk/aws-codebuild';
import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as codepipeline_actions from '@aws-cdk/aws-codepipeline-actions';

import * as lambda from '@aws-cdk/aws-lambda';


export interface PipelineStackProps extends cdk.StackProps {
	readonly lambdaCode: lambda.CfnParametersCode;
}

export class PipelineStack extends cdk.Stack {
	constructor(scope: cdk.Construct, id: string, props: PipelineStackProps) {
		super(scope, id, props);
		
// 		const appArtifact = new s3.Bucket(this, 'AppArtifact', {
// 		    bucketName: 'text-share-artifacts'
// 		});
		
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
		
		// Cdk Build
		const cdkBuildSpec = codebuild.BuildSpec.fromObject({
		    version: "0.2",
		    phases: {
		        install: {
		            'runtime-versions': { 'nodejs': '14' },
		            'commands': [ 'npm install' ]
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
		        install: {
		            'runtime-versions': { 'nodejs': '14' },
		            'commands': [ 'cd lambda', 'npm install' ]
		        },
		        build: {
		            commands: [ 'npm run build' ]
		        }
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
		const stackName = 'TextShareApp';
		const deployAction = new codepipeline_actions.CloudFormationCreateUpdateStackAction({
			extraInputs: [lambdaAppBuildArtifact],
			actionName: 'CfnDeploy',
		    stackName: stackName,
		    adminPermissions: true,
		    parameterOverrides: {
		    	...props.lambdaCode.assign(lambdaAppBuildArtifact.s3Location)
		    },
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
