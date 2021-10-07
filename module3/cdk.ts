#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { TextShareStack } from '../lib/text-share-stack';
import { PipelineStack } from '../lib/pipeline-stack';

const app = new cdk.App();
const textShareStack = new TextShareStack(app, 'TextShareStack', {});
new PipelineStack(app, 'TextSharePipelineStack', {
    lambdaCode: textShareStack.lambdaCode
});
