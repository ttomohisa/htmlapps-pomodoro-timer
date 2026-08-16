# Pomodoro Timer

[![GitHub Pages](https://github.com/ttomohisa/htmlapps-pomodoro-timer/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/ttomohisa/htmlapps-pomodoro-timer/actions/workflows/deploy-pages.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Single HTML](https://img.shields.io/badge/distribution-single%20HTML-0ea5e9)](https://ttomohisa.github.io/htmlapps-pomodoro-timer/)

[English README](README.md)

作業中も画面の隅に置いておける、Picture-in-Pictureを中心に設計したローカル完結の単一HTMLポモドーロタイマーです。

## 🚀 デモ

### [GitHub PagesでPomodoro Timerを開く](https://ttomohisa.github.io/htmlapps-pomodoro-timer/)

GitHub Pagesから最初のHTMLを読み込んだ後、タイマー状態、「このセッションでやること」、設定、履歴はブラウザ内で処理されます。アカウント、Analytics、Telemetry、アプリ本体の実行時ネットワーク通信はありません。

[![Pomodoro Timerの画面](assets/screenshot.png)](https://ttomohisa.github.io/htmlapps-pomodoro-timer/)

## 主な機能

- 25 / 5 / 15分を基本にしたポモドーロサイクル。集中・短い休憩・長い休憩の時間は変更可能
- 対応ブラウザでは**操作できるDocument Picture-in-Picture**を表示
- PiPの小窓から一時停止・再開・5分追加・セッション完了を操作
- Document PiPが使えない場合は**Canvas → Video Picture-in-Picture**へフォールバック
- 大きなToDo管理ではなく、「このセッションでやること」を1つだけ表示
- 設定時間を超えて集中を続けられる**Flow延長**
- ワンタップの**脱線カウンター**と、押し間違いを戻せるUndo
- `setInterval` の回数ではなく終了予定時刻から計算する、バックグラウンドでもズレにくいタイマー
- 通常の集中後は短い休憩、4回目の集中後は長い休憩へ自動進行
- デスクトップ通知とブラウザ内で生成する完了サウンド
- 今日の集中時間・完了セッション数・脱線回数を集計
- 最近の集中履歴をLocalStorageへ保存
- 設定・履歴をJSONで書き出し / 読み込み
- 1つのHTML内で日本語・英語を切り替え
- スマホ向け固定操作ドックを含むモバイルファーストUI
- SVG faviconをHTML内に埋め込み
- 外部ランタイムライブラリ・外部アセットなし

## すぐに使う

### Webで使う

[デモを開く](https://ttomohisa.github.io/htmlapps-pomodoro-timer/)だけで利用できます。インストールやアカウント登録は不要です。

### HTMLをダウンロードして使う

1. [`dist/index.html`](https://github.com/ttomohisa/htmlapps-pomodoro-timer/blob/main/dist/index.html) をダウンロードします。
2. 最新のブラウザで開きます。
3. 「このセッションでやること」に今回終わらせたいことを1つ入力します。
4. **スタート**を押します。

PiPが使えない環境でも通常のタイマーとして利用できます。PiPはブラウザや実行環境に応じて有効になる追加機能です。

### 自分で単一HTMLをビルドする（advance）

1. このリポジトリをダウンロードまたはクローンします。
2. Windowsで `build-standalone.bat` をダブルクリックします。
3. 生成された `dist/index.html` を任意の場所へコピーします。
4. 以降はその1ファイルを、インターネット接続なしでも開けます。

Python、Node.js、ローカルWebサーバーは不要です。ビルドにはWindows PowerShellと、現在のWindowsに標準搭載されている `tar.exe` を使用します。

## 使い方

1. **このセッションでやること**に、今から集中する対象を1つ入力します。
2. **スタート**を押します。
3. デスクトップでは必要に応じて **PiP** を開き、別のタブやアプリで作業します。
4. 集中が切れたことに気づいたら **気が散った** を押します。
5. 意図的に時間を延長したい場合は **+5分** を使います。
6. 集中を終えるときは **完了して次へ** を押します。
7. 通常の集中後は短い休憩、4回目の集中後は長い休憩になります。

### Flow延長

**Flow延長**をONにすると、集中時間が `00:00` になっても強制的に休憩へ移りません。代わりに `+00:01`、`+03:42` のように超過時間をカウントアップします。

ポモドーロをきっかけに集中状態へ入れたとき、「25分だから」という理由だけで作業を切るのを避けるための機能です。

### 脱線カウンター

集中が別のことへ逸れたと気づいたときに **気が散った** を押すだけです。現在のセッションに回数を記録し、押し間違えた場合はトーストから元に戻せます。

細かい行動ログを入力させず、「集中が何回切れたか」だけを残すシンプルな設計です。

## Picture-in-Picture

利用できるブラウザ機能を検出し、可能な範囲で最も使いやすいPiPモードを選びます。

| モード | 内容 |
| --- | --- |
| Document Picture-in-Picture | HTMLの操作可能な小窓。タイマー、現在の集中対象、操作ボタンを表示 |
| Video Picture-in-Picture | Canvasで描画したタイマーを表示。操作は元画面から行う |
| PiP非対応 | 通常のポモドーロタイマーとしてそのまま利用可能 |

Document Picture-in-Pictureの利用可否はブラウザ、OS、セキュアコンテキストなどの条件に依存します。PiPが使えなくても、アプリ本体のタイマー機能には影響しません。

`file://` でHTMLを直接開いた場合も通常のタイマーは利用できますが、Document PiPや通知など一部のブラウザ機能は実行環境によって制限される場合があります。

## キーボードショートカット

| ショートカット | 操作 |
| --- | --- |
| `Space` | 開始 / 一時停止 |
| `P` | PiPを開く / 閉じる |
| `D` | 脱線を記録 |
| `N` | 現在のセッションを完了して次へ |

入力欄などのフォーム操作中はショートカットを発火しません。

## GitHub Pagesで公開する

このリポジトリには、単一HTMLをビルド・検証してGitHub Pagesへ公開するワークフローが含まれています。

1. リポジトリ名を `htmlapps-pomodoro-timer` としてGitHubへプッシュします。
2. **Settings → Pages → Build and deployment → Source** で **GitHub Actions** を選択します。
3. `main` ブランチへプッシュするか、Actions画面からPages用ワークフローを手動実行します。
4. ビルド成功後、`https://ttomohisa.github.io/htmlapps-pomodoro-timer/` で公開されます。

Pagesがまだ有効化されていない場合でも、ワークフローは単一HTMLのビルドとArtifactの保存までは行い、デプロイだけを安全にスキップします。

## 開発とビルド

```text
.
├─ src/index.template.html       # アプリ本体のソーステンプレート
├─ app.config.json               # アプリ情報とビルド設定
├─ dependencies.json             # 内包依存の定義（現在は空）
├─ build-standalone.bat          # Windows用ビルド入口
├─ build-standalone.ps1          # 単一HTML生成処理
├─ scripts/
│  ├─ check-repository.ps1       # リポジトリ全体の検証
│  ├─ verify-standalone.ps1      # 単一HTMLの検証
│  ├─ build-self-extract.ps1     # 自己解凍版の生成
│  └─ verify-self-extract.ps1    # 自己解凍版の検証
├─ dist/
│  ├─ index.html                 # 生成される単一HTML
│  └─ index.self-extract.html    # gzip + Base64の自己解凍版
└─ .github/workflows/
   ├─ build-standalone.yml       # Pull Request時のビルド検証
   └─ deploy-pages.yml           # mainからPagesへ自動公開
```

### ビルド

PowerShell:

```powershell
.\build-standalone.ps1
```

または:

```bat
build-standalone.bat
```

リポジトリ全体を検証する場合:

```powershell
.\scripts\check-repository.ps1
```

ビルド処理では以下を自動で行います。

- `app.config.json` とビルド情報をHTMLテンプレートへ埋め込み
- `dist/index.html` を生成
- 未置換プレースホルダーが残っていないことを検査
- 実行時ネットワーク制限を含む単一HTML要件を検証
- dependency / build manifestを生成
- `dist/index.self-extract.html` を生成して自己解凍内容を検証

## プライバシーと通信防止

タイマーに関するデータは端末内に残す設計です。

- 設定、進行中のタイマー、履歴はブラウザのLocalStorageへ保存
- ログインやクラウドアカウント不要
- Analytics / Telemetryなし
- 外部スクリプト、CSS、フォント、iframe、ランタイム依存なし
- Content Security Policyに `connect-src 'none'` を指定
- アプリ本体の実行にネットワーク通信は不要

GitHub Pages版では最初のHTMLを取得する通信だけが発生します。その後、アプリが扱うタイマー情報はローカルに残ります。完全にネットワークを切って利用する場合は、生成済みの `dist/index.html` をローカルで開いてください。

ブラウザデータを削除したり別のブラウザ環境へ移行したりする場合は、事前にアプリ内の **JSONを書き出す** でバックアップできます。

## 制限事項

- Document Picture-in-Pictureはすべてのブラウザで利用できるわけではありません。
- フォールバックのVideo PiPもブラウザやOSによって利用可否が異なります。
- `file://` で直接開いた場合、一部のブラウザ機能が制限されることがあります。
- デスクトップ通知はブラウザの許可が必要で、実行環境によっては利用できません。
- ブラウザのサイトデータ / LocalStorageを削除すると、JSONへ書き出していない履歴は失われます。
- クラウド同期、共有タスク、本格的なプロジェクト / ToDo管理は意図的に搭載していません。

## 使用ライブラリ

現在のアプリには**実行時の外部ライブラリ依存はありません**。タイマー、PiP、Canvasフォールバック、ローカル保存、通知、サウンド、UIはブラウザAPIとVanilla JavaScriptで実装しています。

詳細は [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) を確認してください。

## コントリビューション

バグ報告や機能提案はIssueからお願いします。開発への参加方法は [CONTRIBUTING.md](CONTRIBUTING.md) を確認してください。

## ライセンス

Copyright © 2026 ttomohisa

このプロジェクトは [MIT License](LICENSE) で公開されています。
