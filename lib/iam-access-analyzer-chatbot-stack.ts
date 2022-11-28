import { Stack, StackProps, aws_scheduler as scheduler } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as chatbot from 'aws-cdk-lib/aws-chatbot';
import * as events from 'aws-cdk-lib/aws-events';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as targets from 'aws-cdk-lib/aws-events-targets';

export interface props extends StackProps {
  projectName: String;
  envName: String;
  slackWorkspaceId: string;
  slackChannel: string;
}

export class IamAccessAnalyzerChatbotStack extends Stack {
  constructor(scope: Construct, id: string, props: props) {
    super(scope, id, props);
    /**
     *  Create a SNS for the eventbridge
     */
    const snsTopic = new sns.Topic(this, `${props.projectName}-${props.envName}-sns`, {
      topicName: `${props.projectName}-${props.envName}-sns`,
      displayName: `${props.projectName}-${props.envName}-sns`,
    });
    snsTopic.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ['sns:Publish'],
        principals: [new iam.ServicePrincipal('cloudwatch.amazonaws.com')],
        resources: ['*'],
      })
    );

    /**
     *  Create a EventBridge
     */
    // Access Analyzer
    new events.Rule(this, `${props.projectName}-${props.envName}-eventbridge`, {
      ruleName: `${props.projectName}-${props.envName}-eventbridge`,
      eventPattern: {
        source: ['aws.securityhub'],
        detailType: ['Security Hub Findings - Imported'],
        detail: {
          findings: {
            ProductName: ['IAM Access Analyzer'],
            Resources: { Type: [{ 'anything-but': 'AwsIamRole' }] },
            Severity: { Label: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
            RecordState: ['ACTIVE'],
          },
        },
      },
      targets: [new targets.SnsTopic(snsTopic)],
    });
    new events.Rule(this, `${props.projectName}-${props.envName}-eventbridge-to-detect-role`, {
      ruleName: `${props.projectName}-${props.envName}-eventbridge-to-detect-role`,
      eventPattern: {
        source: ['aws.securityhub'],
        detailType: ['Security Hub Findings - Imported'],
        detail: {
          findings: {
            ProductName: ['IAM Access Analyzer'],
            Region: ['ap-northeast-1'],
            Resources: { Type: ['AwsIamRole'] },
            Severity: { Label: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
            RecordState: ['ACTIVE'],
          },
        },
      },
      targets: [new targets.SnsTopic(snsTopic)],
    });

    /**
     *  Create a Chatbot
     */
    const slackChatbot = new chatbot.SlackChannelConfiguration(this, `${props.projectName}-${props.envName}-chatbot`, {
      slackChannelConfigurationName: `${props.projectName}-${props.envName}-chatbot`,
      slackWorkspaceId: props.slackWorkspaceId,
      slackChannelId: props.slackChannel,
      notificationTopics: [snsTopic],
    });
    const cfnSlackChannelConfiguration = slackChatbot.node.defaultChild as chatbot.CfnSlackChannelConfiguration;
    cfnSlackChannelConfiguration.addOverride('Properties.GuardrailPolicies', ['arn:aws:iam::aws:policy/ReadOnlyAccess']);
  }
}
