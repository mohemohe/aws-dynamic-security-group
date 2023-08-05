# aws-dynamic-security-group

DDNSのようにAWSのセキュリティーグループをダイナミックに変更します。

## 設定

テンプレートが必要な場合は `sample.config.json` を `config.json` にコピーしてください。

```json5
{
  "checkIntervalSec": 60, // チェック間隔の秒数を指定します
  "aws": { // AWS SDKのオプションにそのまま渡されます 不要なキーは消してください
    "region": "ap-northeast-1",
    "credentials": {
      "accessKeyId": "xxxx",
      "secretAccessKey": "yyyy"
    }
  },
  "rules": [ // ルール定義
    {
      "securityGroupRuleId": "sgr-02b31b88f6dca014f", // セキュリティグループルール IDを指定します（セキュリティグループ IDではありません）
      "source": "ipv4" // IPアドレス取得元を指定します（ipv4 or dns） ipv4の場合は https://checkip.amazonaws.com から取得します
    },
    {
      "securityGroupRuleId": "sgr-07ff247cc08255ff8",
      "source": "dns",
      "domain": "example.com" // sourceがdnsの場合に、どのドメインから取得するか指定します
    }
  ]
}
```

## 実行

```sh
node index.js
```

[PM2](https://pm2.keymetrics.io/)をインストールしてある場合は、リポジトリ内の `ecosystem.config.js` を利用してdeamonizeできます。

```sh
pm2 start
# pm2 save
# pm2 startup
```