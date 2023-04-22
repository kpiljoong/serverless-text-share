import * as cdk from 'aws-cdk-lib';

// 필요한 라이브러리 import
import * as ddb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigw from 'aws-cdk-lib/aws-apigateway';

export class TextShareStack extends cdk.Stack {
	constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
		super(scope, id, props);
		
		// DDB 테이블 생성
		const table = new ddb.Table(this, 'TextShareData', {
			partitionKey: {
				name: 'pid',
				type: ddb.AttributeType.STRING
			}
		});
		
		// Lambda 함수 선언
		const fn = new lambda.Function(this, 'TextShareBackend', {
			runtime: lambda.Runtime.NODEJS_14_X,
			handler: 'index.handler',
			code: lambda.Code.fromAsset('./lambda')
		});
		
		fn.addEnvironment('TABLE_NAME', table.tableName);
		table.grantReadWriteData(fn);
		
		const api = new apigw.LambdaRestApi(this, 'TextSharingApi', {
			handler: fn
		});
	}
}