import * as cdk from '@aws-cdk/core';

import ddb = require('@aws-cdk/aws-dynamodb');
import lambda = require('@aws-cdk/aws-lambda');
import apigw = require('@aws-cdk/aws-apigateway');

export class TextShareStack extends cdk.Stack {
    
    public readonly lambdaCode: lambda.CfnParametersCode;
    
	constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
		super(scope, id, props);
		
		this.lambdaCode = lambda.Code.cfnParameters();
		
		const table = new ddb.Table(this, 'TextSharegData', {
    	partitionKey: {
    		name: 'pid',
    		type: ddb.AttributeType.STRING
    	}
    });
    
    const fn = new lambda.Function(this, 'TextShareBackend', {
    	runtime: lambda.Runtime.NODEJS_12_X,
    	handler: 'index.handler',
    	// code: lambda.Code.fromAsset('./lambda')
    	code: this.lambdaCode
    });
    
    fn.addEnvironment('TABLE_NAME', table.tableName);
    table.grantReadWriteData(fn);
    
    const api = new apigw.LambdaRestApi(this, 'TextSharingApi', {
    	handler: fn
    });
	}
}