const { resolve4 } = require('dns/promises');
const { EC2Client, DescribeSecurityGroupRulesCommand, ModifySecurityGroupRulesCommand } = require('@aws-sdk/client-ec2');
const fetch = require('isomorphic-fetch');

const config = require('./config.json');

const originalIpAddrs = {
  ipv4: "",
  domains: {
  },
};

let ipAddrs;

async function queryPublicIpv4() {
  const res = await fetch('https://checkip.amazonaws.com');
  ipAddrs.ipv4 = (await res.text()).trim();
}

async function queryDomain(domain) {
  const [ipAddr] = await resolve4(domain);
  if (!ipAddr) {
    throw new Error(`dns query error: ${domain}`);
  }
  ipAddrs.domains[domain] = ipAddr;
}

async function task() {
  ipAddrs = JSON.parse(JSON.stringify(originalIpAddrs));

  const client = new EC2Client({
    ...config.aws,
  });

  for (const rule of config.rules) {
    let ipAddr;

    switch (rule.source) {
      case "ipv4":
        if (!ipAddrs.ipv4) {
          await queryPublicIpv4();
        }
        ipAddr = ipAddrs.ipv4;
        break;
      case "dns":
        if (!ipAddrs.domains[rule.domain]) {
          await queryDomain(rule.domain);
        }
        ipAddr = ipAddrs.domains[rule.domain];
        break;
      default:
        throw new Error("invalid rule source");
    }

    const cidrIpv4 = `${ipAddr}/32`;

    const { SecurityGroupRules } = await client.send(new DescribeSecurityGroupRulesCommand({
      SecurityGroupRuleIds: [rule.securityGroupRuleId],
    }));

    const currentRule = SecurityGroupRules?.find((rules) => rule.securityGroupRuleId === rule.securityGroupRuleId);
    if (!currentRule) {
      continue;
    }
    if (currentRule.CidrIpv4 === cidrIpv4) {
      console.log(`${rule.securityGroupRuleId}: ${currentRule.CidrIpv4} -> ${cidrIpv4} (skipped)`);
      continue;
    }
    console.log(`${rule.securityGroupRuleId}: ${currentRule.CidrIpv4} -> ${cidrIpv4}`);
    await client.send(new ModifySecurityGroupRulesCommand({
      GroupId: currentRule.GroupId,
      SecurityGroupRules: [
        {
          SecurityGroupRuleId: currentRule.SecurityGroupRuleId,
          SecurityGroupRule: {
            ...currentRule,
            CidrIpv4: cidrIpv4,
          }
        }
      ]
    }));
  }
};

task();
setInterval(task, (config.checkIntervalSec || 60) * 1000);
