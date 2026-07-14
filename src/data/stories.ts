export interface StoryCard {
  id: string;
  page: number;
  unlockLevel: number;
  title: string;
  content: string;
}

const firstStory: StoryCard = {
  id: "story-1",
  page: 1,
  unlockLevel: 2,
  title: "第1頁　勇者の伝承",
  content: "世界が危機に陥るたび、勇者は現れるという。\nその名は時代ごとに異なるが、人々を導く存在として語り継がれている。"
};

export const STORY_CARDS: StoryCard[] = [firstStory];

// 残りの97枚（第2頁〜第98頁、Lv3〜Lv99）を「設定中」として生成
for (let i = 2; i <= 98; i++) {
  STORY_CARDS.push({
    id: `story-${i}`,
    page: i,
    unlockLevel: i + 1, // Lv3からLv99
    title: `第${i}頁　設定中`,
    content: "魔導書のこの頁は、未だ闇の霧に包まれている。\nさらなる修行を積み、レベルを上げることで封印が解かれるだろう。"
  });
}
