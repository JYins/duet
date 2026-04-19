// lightweight i18n — no library, just a map
//
// three languages: en, zh (simplified chinese), ko (korean)
// brand name "Duet" always stays as-is with capital D

export type Locale = "en" | "zh" | "ko";

const translations = {
  // landing
  "landing.tagline": {
    en: "take photos together,\neven when you are apart",
    zh: "一起拍照，\n即使相隔千里",
    ko: "함께 사진을 찍어요,\n멀리 떨어져 있어도",
  },
  "landing.startDuet": {
    en: "start a Duet",
    zh: "开始合拍",
    ko: "듀엣 시작",
  },
  "landing.soloBooth": {
    en: "solo booth",
    zh: "单人拍照",
    ko: "혼자 찍기",
  },
  "landing.haveCode": {
    en: "have a room code?",
    zh: "有房间码？",
    ko: "방 코드가 있나요?",
  },
  "landing.join": {
    en: "join",
    zh: "加入",
    ko: "참여",
  },
  "landing.footer": {
    en: "on-device · private · collaborative",
    zh: "本地处理 · 隐私安全 · 协作拍摄",
    ko: "온디바이스 · 프라이버시 · 콜라보",
  },

  // booth
  "booth.tapToShoot": {
    en: "tap to take 4 photos",
    zh: "点击拍摄 4 张照片",
    ko: "탭하여 4장 촬영",
  },
  "booth.loadingModel": {
    en: "loading segmentation model...",
    zh: "加载分割模型中...",
    ko: "세그멘테이션 모델 로딩...",
  },
  "booth.startingCamera": {
    en: "starting camera...",
    zh: "启动摄像头...",
    ko: "카메라 시작 중...",
  },
  "booth.compositing": {
    en: "compositing your strip...",
    zh: "正在合成照片条...",
    ko: "스트립 합성 중...",
  },
  "booth.depth": {
    en: "depth",
    zh: "景深",
    ko: "심도",
  },
  "booth.selectPhotos": {
    en: "select your favorites",
    zh: "选择你最喜欢的",
    ko: "마음에 드는 사진을 선택하세요",
  },
  "booth.confirmSelection": {
    en: "use these",
    zh: "就这些",
    ko: "이걸로",
  },
  "booth.countdown": {
    en: "countdown",
    zh: "倒计时",
    ko: "카운트다운",
  },
  "booth.labelPlaceholder": {
    en: "add a caption...",
    zh: "写点什么...",
    ko: "캡션을 입력하세요...",
  },
  "booth.layout": {
    en: "layout",
    zh: "布局",
    ko: "레이아웃",
  },

  // result
  "result.retake": {
    en: "retake",
    zh: "重拍",
    ko: "다시 찍기",
  },
  "result.save": {
    en: "save",
    zh: "保存",
    ko: "저장",
  },
  "result.share": {
    en: "share",
    zh: "分享",
    ko: "공유",
  },
  "result.shared": {
    en: "shared",
    zh: "已分享",
    ko: "공유됨",
  },

  // create room
  "create.title": {
    en: "create room",
    zh: "创建房间",
    ko: "방 만들기",
  },
  "create.creatingRoom": {
    en: "creating room...",
    zh: "创建房间中...",
    ko: "방 만드는 중...",
  },
  "create.takeAndShare": {
    en: "take your photos, then share the room",
    zh: "拍完照片后分享房间",
    ko: "사진을 찍고 방을 공유하세요",
  },
  "create.yourDuet": {
    en: "your Duet",
    zh: "你的合拍",
    ko: "나의 듀엣",
  },
  "create.waiting": {
    en: "waiting for your friend...",
    zh: "等待好友加入...",
    ko: "친구를 기다리는 중...",
  },
  "create.friendJoined": {
    en: "your friend joined! compositing...",
    zh: "好友已加入！合成中...",
    ko: "친구가 참여했어요! 합성 중...",
  },

  // room (guest)
  "room.joining": {
    en: "joining room...",
    zh: "加入房间中...",
    ko: "방 참여 중...",
  },
  "room.notFound": {
    en: "room not found or expired",
    zh: "房间不存在或已过期",
    ko: "방을 찾을 수 없거나 만료됨",
  },
  "room.backHome": {
    en: "back home",
    zh: "返回首页",
    ko: "홈으로",
  },
  "room.alignGhost": {
    en: "align yourself with the ghost overlay, then tap to shoot",
    zh: "对齐半透明人像后点击拍摄",
    ko: "고스트 오버레이에 맞춰 포즈를 잡고 탭하세요",
  },
  "room.uploading": {
    en: "uploading photos...",
    zh: "上传照片中...",
    ko: "사진 업로드 중...",
  },
  "room.compositing": {
    en: "compositing strip...",
    zh: "合成照片条中...",
    ko: "스트립 합성 중...",
  },

  // share card
  "share.scanToJoin": {
    en: "scan to join",
    zh: "扫码加入",
    ko: "스캔하여 참여",
  },
  "share.or": {
    en: "or",
    zh: "或",
    ko: "또는",
  },
  "share.roomCode": {
    en: "room code",
    zh: "房间码",
    ko: "방 코드",
  },
  "share.copyLink": {
    en: "copy link",
    zh: "复制链接",
    ko: "링크 복사",
  },
  "share.linkCopied": {
    en: "link copied",
    zh: "已复制",
    ko: "복사됨",
  },

  // 404
  "notFound.title": {
    en: "lost in the darkroom",
    zh: "迷失在暗房",
    ko: "암실에서 길을 잃다",
  },
  "notFound.body": {
    en: "this page doesn't exist, but the booth does",
    zh: "页面不存在，但拍照亭还在",
    ko: "이 페이지는 없지만, 포토부스는 있어요",
  },
  "notFound.back": {
    en: "back to Duet",
    zh: "回到 Duet",
    ko: "Duet으로 돌아가기",
  },

  // lut labels
  "lut.natural": {
    en: "natural",
    zh: "自然",
    ko: "내추럴",
  },
  "lut.portra": {
    en: "portra",
    zh: "胶片",
    ko: "포트라",
  },
  "lut.cool": {
    en: "cool",
    zh: "冷调",
    ko: "쿨톤",
  },
  "lut.mono": {
    en: "mono",
    zh: "黑白",
    ko: "모노",
  },

  // modes
  "mode.async": {
    en: "together",
    zh: "一起拍",
    ko: "함께 찍기",
  },
  "mode.asyncDesc": {
    en: "everyone takes their own photos, combined into one strip",
    zh: "每人拍自己的照片，合成一张",
    ko: "각자 찍고 한 장으로 합성",
  },
  "mode.ghost": {
    en: "ghost mode",
    zh: "虚影合拍",
    ko: "고스트 모드",
  },
  "mode.ghostDesc": {
    en: "see your friend's silhouette while you shoot, look like you're together",
    zh: "拍照时看到朋友的虚影，看起来像在一起",
    ko: "친구의 실루엣을 보면서 촬영, 함께 있는 것처럼",
  },

  // config
  "config.participants": {
    en: "people",
    zh: "人数",
    ko: "인원",
  },
  "config.layout": {
    en: "layout",
    zh: "布局",
    ko: "레이아웃",
  },
  "config.background": {
    en: "background",
    zh: "背景",
    ko: "배경",
  },
  "config.createRoom": {
    en: "create room",
    zh: "创建房间",
    ko: "방 만들기",
  },

  // waiting room
  "waiting.participants": {
    en: "participants",
    zh: "参与者",
    ko: "참여자",
  },
  "waiting.startShooting": {
    en: "start my turn",
    zh: "开始拍照",
    ko: "내 차례 시작",
  },
  "waiting.waitingOthers": {
    en: "waiting for others...",
    zh: "等待其他人...",
    ko: "다른 사람을 기다리는 중...",
  },
  "waiting.allSubmitted": {
    en: "all done! generating strip...",
    zh: "全部完成！正在生成...",
    ko: "모두 완료! 생성 중...",
  },

  // join
  "join.enterName": {
    en: "your name",
    zh: "你的名字",
    ko: "이름을 입력하세요",
  },
  "join.join": {
    en: "join room",
    zh: "加入房间",
    ko: "방 참여",
  },
  "join.full": {
    en: "room is full",
    zh: "房间已满",
    ko: "방이 가득 찼습니다",
  },
} as const;

export type TranslationKey = keyof typeof translations;

// detect browser language, fallback to english
export function detectLocale(): Locale {
  if (typeof navigator === "undefined") return "en";

  const lang = navigator.language.toLowerCase();
  if (lang.startsWith("zh")) return "zh";
  if (lang.startsWith("ko")) return "ko";
  return "en";
}

export function t(key: TranslationKey, locale: Locale): string {
  const entry = translations[key];
  if (!entry) return key;
  return entry[locale] || entry.en;
}

export const LOCALE_LABELS: { id: Locale; label: string }[] = [
  { id: "en", label: "EN" },
  { id: "zh", label: "中" },
  { id: "ko", label: "한" },
];
