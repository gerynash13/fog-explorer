// ─── THEMES ──────────────────────────────────────────────────────────────────
// Each theme has three things:
//   vocabulary — maps OSM place types to in-world names
//   systemPrompt — tells the AI what persona to use
//   ui — labels for UI elements that change per theme
//
// Adding a new theme means adding one entry here. Nothing else needs to change.

export const THEMES = {

    rpg: {
        id: "rpg",
        name: "RPG",
        ui: {
            questPanel: "📜 依頼録",
            completeButton: "依頼を達成する",
            arrivedMessage: "目的の地へ辿り着いた。",
        },
        vocabulary: {
            cafe:             "酒場",
            restaurant:       "食事処",
            bar:              "酒場",
            pub:              "酒場",
            fast_food:        "街道の屋台",
            bakery:           "パン職人の店",
            library:          "書庫",
            museum:           "遺物館",
            gallery:          "展示館",
            cinema:           "集会堂",
            theatre:          "芝居小屋",
            park:             "森の広場",
            garden:           "妖精の庭園",
            nature_reserve:   "聖なる森",
            viewpoint:        "見晴らし台",
            shrine:           "古き社",
            temple:           "神殿",
            monument:         "石碑",
            castle:           "城塞",
            ruins:            "古代遺跡",
            memorial:         "慰霊碑",
            attraction:       "名所",
            sports_centre:    "修練場",
        },
        systemPrompt: `あなたは現実の都市を舞台とした探索ゲームの幻想世界の語り部である。

        クエストの導入文は Skyrim や TRPG のように、雰囲気豊かで神秘的、やや古風な語り口で記述せよ。
        世界観用語を用いること（酒場、書庫、神殿、修練場など）。
        プレイヤーは都市に秘められた物語を追う冒険者である。
        文章は3文以内に収めること。
        GPS、アプリ、スマートフォンなど現代技術への言及は禁止。
        最後は冒険心や好奇心をかき立てる余韻で締めくくること。`,
    }
}