# 🚀 GitHub Pages へのデプロイ・公開ガイド

このプロジェクトには、GitHub にコードをプッシュするだけで、独自のゲームURLに自動ビルド＆公開するための **GitHub Actions ワークフロー** が既に完備されています（`.github/workflows/deploy.yml`）。

以下の手順に沿って設定を行うことで、完全無料で世界中にゲームを公開できます！

---

## 1. 準備：GitHub にリポジトリを作成してプッシュする
1. Webブラウザで [GitHub](https://github.com) にログイン。
2. 右上の **[New]** から新しいリポジトリを作成します。
3. ローカルのコード、またはAI StudioからダウンロードしたZIPを展開したソースコード一式を、作成したリポジトリにコミット＆プッシュ（`main` または `master` ブランチ）します。
   ```bash
   git init
   git add .
   git commit -m "feat: initial commit with time-attack"
   git branch -M main
   git remote add origin https://github.com/【ユーザー名】/【リポジトリ名】.git
   git push -u origin main
   ```

---

## 2. GitHub Pages を有効化する（初回のみ）
リポジトリにプッシュすると自動的にビルド等のアクションが動き始めますが、GitHub 側で **GitHub Actions からのデプロイを許可（Pagesのソースを変更）** する必要があります。

1. GitHub上の対象リポジトリを開き、上部の **⚙️ Settings** タブをクリックします。
2. 左メニューの **[Code and automation]** セクションにある **[Pages]** をクリックします。
3. **Build and deployment** セクションの **Source** ドロップダウンメニューを確認します。
   - デフォルトは `Deploy from a branch` になっています。
   - これを 🔄 **`GitHub Actions`** に切り替えます。

これで設定は完了です！

---

## 3. 自動デプロイと確認
1. **⚙️ Settings** から `GitHub Actions` に設定を切り替えた瞬間（または次回以降 `main` / `master` にプッシュした際）、自動的にビルドが開始されます。
2. 進行状況は、リポジトリ上部の **Actions** タブからリアルタイムに確認できます。
3. ジョブが最後まで成功すると、Actions 画面のトップや **Settings > Pages** の画面に、あなたの専用URL（例: `https://【ユーザー名】.github.io/【リポジトリ名】/`）が表示されます。

---

## 💡 手動によるローカル確認方法

GitHub Pages にデプロイする前に、ローカル環境で本番用ビルドが正常に動くか検証することもできます：

1. **パッケージのインストール**
   ```bash
   npm install
   ```

2. **本番用ビルド & プレビューの実行**
   ```bash
   npm run build
   npm run preview
   ```
   ターミナルに出力される `http://localhost:4173/` 等にブラウザでアクセスして動作を確認します。
