#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { IamAccessAnalyzerChatbotStack } from '../lib/iam-access-analyzer-chatbot-stack';

const app = new cdk.App();
const projectName = app.node.tryGetContext('projectName');
const envKey = app.node.tryGetContext('env');
const envValues = app.node.tryGetContext(envKey);
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};
new IamAccessAnalyzerChatbotStack(app, 'IamAccessAnalyzerChatbotStack', {
  projectName: projectName,
  envName: envValues.envName,
  env: env,
  slackChannel: 'YOUR_CHANNEL',
  slackWorkspaceId: 'YOUR_WORKSPACEID',
});
