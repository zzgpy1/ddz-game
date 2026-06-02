# 🎮 棋牌游戏合集 | 斗地主 + 麻将三缺一

> 经典棋牌游戏二合一，智能AI对手，随时随地开局！

[![GitHub Pages](https://img.shields.io/badge/GitHub-Pages-green)](https://你的用户名.github.io/multi-game/)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

## 🎯 游戏介绍

这是一个包含两款经典棋牌游戏的网页合集：

### 🔥 斗地主
- 三人斗地主，经典玩法
- 支持叫地主、炸弹、王炸、顺子等全部牌型
- 智能AI决策系统

### 🀄 麻将三缺一  
- 三人麻将，AI补位
- 支持碰、杠、胡（点炮/自摸）
- 简化规则，快速上手

## 🚀 快速开始

### 在线游玩
访问 GitHub Pages：`https://你的用户名.github.io/multi-game/`

### 本地运行
```bash
# 克隆项目
git clone https://github.com/你的用户名/multi-game.git
cd multi-game

# 启动HTTP服务器
python -m http.server 8080

# 访问 http://localhost:8080

🎮 游戏玩法
斗地主
点击【发牌】开始新游戏

叫分阶段：依次叫1-3分，叫分最高者成为地主

出牌阶段：地主先出，按逆时针轮流出牌

先出完手牌者获胜

麻将三缺一
点击【发牌】开始

庄家先出牌，按逆时针轮流

可以碰、杠、胡

先胡牌者获胜

📦 部署指南
详细部署步骤请参考 docs/guide.md

快速部署到GitHub Pages
Fork本项目到你的GitHub

仓库 Settings → Pages → Branch 选择 main

等待1-3分钟，通过 https://你的用户名.github.io/仓库名/ 访问

🛠️ 技术栈
HTML5 Canvas - 游戏渲染

Vanilla JavaScript - 游戏逻辑

CSS3 - 响应式样式

📝 自定义
修改AI难度
斗地主：修改 doudizhu.js 中的 aiBid() 和 aiTurn() 决策阈值

麻将：修改 mahjong.js 中的AI出牌策略

修改游戏规则
斗地主：修改 getType() 和 canBeat() 函数

麻将：修改 checkHu() 胡牌判定逻辑

🤝 贡献
欢迎提交Issue和Pull Request！

📄 许可证
MIT License - 自由使用、修改、分发
