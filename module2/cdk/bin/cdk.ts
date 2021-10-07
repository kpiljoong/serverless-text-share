#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { TextShareStack } from '../lib/text-share-stack';

const app = new cdk.App();

new TextShareStack(app, 'TextShareStack', {});