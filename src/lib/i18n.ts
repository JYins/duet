export type Locale = "en" | "zh" | "ko";

const translations = {
  "landing.tagline": {
    en: "A Korean-style photo booth for two people,\neven when you are apart.",
    zh: "两个人的韩式拍照亭，\n就算相隔很远也能一起拍。",
    ko: "멀리 있어도 함께 찍는\n둘만의 한국식 포토부스.",
  },
  "landing.startDuet": {
    en: "Start a duet",
    zh: "开始合拍",
    ko: "함께 시작",
  },
  "landing.soloBooth": {
    en: "Solo booth",
    zh: "单人拍摄",
    ko: "혼자 촬영",
  },
  "landing.haveCode": {
    en: "Have a room code?",
    zh: "已有房间码？",
    ko: "방 코드가 있나요?",
  },
  "landing.join": {
    en: "Join",
    zh: "加入",
    ko: "입장",
  },
  "landing.footer": {
    en: "Private capture / soft film / made for two",
    zh: "私密拍摄 / 柔和胶片 / 为两个人设计",
    ko: "프라이빗 촬영 / 부드러운 필름 / 둘을 위한 디자인",
  },
  "landing.demoFilm": {
    en: "Film warm",
    zh: "暖调胶片",
    ko: "따뜻한 필름",
  },
  "landing.demoGhost": {
    en: "Ghost align",
    zh: "虚影对位",
    ko: "고스트 정렬",
  },
  "landing.demoGrain": {
    en: "Soft grain",
    zh: "柔和颗粒",
    ko: "부드러운 그레인",
  },
  "landing.demoShare": {
    en: "Share strip",
    zh: "分享相纸",
    ko: "스트립 공유",
  },

  "shell.guide": {
    en: "Guide",
    zh: "指引",
    ko: "가이드",
  },
  "shell.room": {
    en: "Room",
    zh: "房间",
    ko: "방",
  },
  "shell.privateBooth": {
    en: "Private booth",
    zh: "私密拍照亭",
    ko: "프라이빗 부스",
  },

  "booth.tapToShoot": {
    en: "Tap when you are ready",
    zh: "准备好后点击拍摄",
    ko: "준비되면 눌러주세요",
  },
  "booth.loadingModel": {
    en: "Loading portrait model...",
    zh: "正在加载人像模型...",
    ko: "인물 모델을 불러오는 중...",
  },
  "booth.startingCamera": {
    en: "Starting camera...",
    zh: "正在启动相机...",
    ko: "카메라를 켜는 중...",
  },
  "booth.compositing": {
    en: "Making your strip...",
    zh: "正在生成相纸...",
    ko: "사진 스트립을 만드는 중...",
  },
  "booth.depth": {
    en: "Depth",
    zh: "景深",
    ko: "깊이",
  },
  "booth.selectPhotos": {
    en: "Choose your favorites",
    zh: "选择最喜欢的照片",
    ko: "마음에 드는 사진을 골라주세요",
  },
  "booth.confirmSelection": {
    en: "Use these",
    zh: "使用这些",
    ko: "이 사진 사용",
  },
  "booth.countdown": {
    en: "Timer",
    zh: "倒计时",
    ko: "타이머",
  },
  "booth.labelPlaceholder": {
    en: "Add a caption...",
    zh: "写一句小标题...",
    ko: "짧은 문구를 써보세요...",
  },
  "booth.layout": {
    en: "Layout",
    zh: "版式",
    ko: "레이아웃",
  },
  "booth.shots": {
    en: "Shots",
    zh: "张数",
    ko: "컷 수",
  },
  "booth.cameraDenied": {
    en: "Camera access is needed to use Duet. Please allow camera permission in your browser.",
    zh: "Duet 需要相机权限。请在浏览器中允许访问相机。",
    ko: "Duet을 사용하려면 카메라 권한이 필요합니다. 브라우저에서 카메라 접근을 허용해주세요.",
  },
  "booth.preparingCamera": {
    en: "Preparing camera...",
    zh: "正在准备相机...",
    ko: "카메라를 준비하는 중...",
  },
  "booth.capture": {
    en: "Capture",
    zh: "拍摄",
    ko: "촬영",
  },
  "booth.lastCapture": {
    en: "Last capture",
    zh: "上一张照片",
    ko: "마지막 촬영",
  },
  "booth.toolLayout": {
    en: "Layout",
    zh: "版式",
    ko: "레이아웃",
  },
  "booth.toolGhost": {
    en: "Ghost",
    zh: "虚影",
    ko: "고스트",
  },
  "booth.toolFilter": {
    en: "Filter",
    zh: "滤镜",
    ko: "필터",
  },
  "booth.toolFlip": {
    en: "Flip",
    zh: "切换",
    ko: "전환",
  },
  "booth.toolLens": {
    en: "Lens",
    zh: "镜头",
    ko: "렌즈",
  },
  "booth.toolTogether": {
    en: "Together",
    zh: "一起拍",
    ko: "함께",
  },
  "booth.toolOff": {
    en: "Off",
    zh: "关闭",
    ko: "꺼짐",
  },
  "booth.toolFilmWarm": {
    en: "Film Warm",
    zh: "暖胶片",
    ko: "웜 필름",
  },
  "booth.you": {
    en: "You",
    zh: "你",
    ko: "나",
  },
  "booth.partner": {
    en: "Partner",
    zh: "对方",
    ko: "파트너",
  },
  "booth.solo": {
    en: "Solo",
    zh: "单人",
    ko: "솔로",
  },
  "booth.readyToCapture": {
    en: "Ready to capture",
    zh: "准备拍摄",
    ko: "촬영 준비",
  },
  "booth.captured": {
    en: "captured",
    zh: "已拍",
    ko: "촬영됨",
  },
  "booth.refreshStrip": {
    en: "Refresh strip",
    zh: "刷新相纸",
    ko: "스트립 새로 만들기",
  },

  "result.retake": {
    en: "Retake",
    zh: "重拍",
    ko: "다시 찍기",
  },
  "result.save": {
    en: "Save",
    zh: "保存",
    ko: "저장",
  },
  "result.share": {
    en: "Share",
    zh: "分享",
    ko: "공유",
  },
  "result.shared": {
    en: "Shared",
    zh: "已分享",
    ko: "공유됨",
  },
  "result.shareText": {
    en: "Made with Duet",
    zh: "用 Duet 制作的合拍相纸",
    ko: "Duet으로 만든 포토 스트립",
  },
  "result.alt": {
    en: "Duet photo strip",
    zh: "Duet 合拍相纸",
    ko: "Duet 포토 스트립",
  },

  "create.title": {
    en: "Create room",
    zh: "创建房间",
    ko: "방 만들기",
  },
  "create.creatingRoom": {
    en: "Creating room...",
    zh: "正在创建房间...",
    ko: "방을 만드는 중...",
  },
  "create.takeAndShare": {
    en: "Take your turn, then invite your partner",
    zh: "先完成你的拍摄，再邀请对方",
    ko: "먼저 촬영한 뒤 파트너를 초대하세요",
  },
  "create.yourDuet": {
    en: "Your Duet",
    zh: "你的合拍",
    ko: "나의 Duet",
  },
  "create.waiting": {
    en: "Waiting for your partner...",
    zh: "正在等待对方...",
    ko: "파트너를 기다리는 중...",
  },
  "create.friendJoined": {
    en: "Your partner joined. Making the strip...",
    zh: "对方已加入，正在生成相纸...",
    ko: "파트너가 입장했어요. 스트립을 만드는 중...",
  },

  "room.joining": {
    en: "Joining room...",
    zh: "正在加入房间...",
    ko: "방에 입장하는 중...",
  },
  "room.notFound": {
    en: "Room not found or expired.",
    zh: "房间不存在或已过期。",
    ko: "방을 찾을 수 없거나 만료되었어요.",
  },
  "room.backHome": {
    en: "Back to Duet",
    zh: "返回 Duet",
    ko: "Duet으로 돌아가기",
  },
  "room.alignGhost": {
    en: "Align with your partner's outline",
    zh: "对齐对方的人像轮廓",
    ko: "파트너의 윤곽에 맞춰주세요",
  },
  "room.uploading": {
    en: "Uploading photos...",
    zh: "正在上传照片...",
    ko: "사진을 업로드하는 중...",
  },
  "room.compositing": {
    en: "Making the shared strip...",
    zh: "正在生成合拍相纸...",
    ko: "함께 찍은 스트립을 만드는 중...",
  },

  "share.scanToJoin": {
    en: "Scan to join",
    zh: "扫码加入",
    ko: "스캔해서 입장",
  },
  "share.or": {
    en: "or",
    zh: "或",
    ko: "또는",
  },
  "share.roomCode": {
    en: "Room code",
    zh: "房间码",
    ko: "방 코드",
  },
  "share.copyLink": {
    en: "Copy link",
    zh: "复制链接",
    ko: "링크 복사",
  },
  "share.linkCopied": {
    en: "Link copied",
    zh: "链接已复制",
    ko: "링크가 복사되었어요",
  },

  "notFound.title": {
    en: "Lost in the darkroom",
    zh: "迷失在暗房里",
    ko: "암실에서 길을 잃었어요",
  },
  "notFound.body": {
    en: "This page does not exist, but the booth is still open.",
    zh: "这个页面不存在，但拍照亭还亮着。",
    ko: "이 페이지는 없지만 포토부스는 열려 있어요.",
  },
  "notFound.back": {
    en: "Back to Duet",
    zh: "回到 Duet",
    ko: "Duet으로 돌아가기",
  },

  "lut.natural": {
    en: "Natural",
    zh: "自然",
    ko: "내추럴",
  },
  "lut.portra": {
    en: "Portra",
    zh: "胶片",
    ko: "필름",
  },
  "lut.cool": {
    en: "Cool",
    zh: "冷调",
    ko: "쿨톤",
  },
  "lut.mono": {
    en: "Mono",
    zh: "黑白",
    ko: "흑백",
  },

  "mode.async": {
    en: "Together",
    zh: "一起拍",
    ko: "함께 찍기",
  },
  "mode.asyncDesc": {
    en: "Each person shoots on their own phone, then Duet combines the strip.",
    zh: "两个人分别用手机拍摄，Duet 自动合成一张相纸。",
    ko: "각자 휴대폰으로 찍으면 Duet이 하나의 스트립으로 합쳐줘요.",
  },
  "mode.ghost": {
    en: "Ghost",
    zh: "虚影合拍",
    ko: "고스트 촬영",
  },
  "mode.ghostDesc": {
    en: "See your partner's outline while posing, so it feels like one booth.",
    zh: "拍摄时看到对方轮廓，看起来像真的在同一个拍照亭。",
    ko: "포즈를 잡을 때 파트너의 윤곽을 보며 한 부스처럼 맞출 수 있어요.",
  },

  "config.participants": {
    en: "People",
    zh: "人数",
    ko: "인원",
  },
  "config.layout": {
    en: "Layout",
    zh: "版式",
    ko: "레이아웃",
  },
  "config.background": {
    en: "Background",
    zh: "背景",
    ko: "배경",
  },
  "config.createRoom": {
    en: "Create room",
    zh: "创建房间",
    ko: "방 만들기",
  },

  "waiting.participants": {
    en: "Participants",
    zh: "参与者",
    ko: "참여자",
  },
  "waiting.startShooting": {
    en: "Start my turn",
    zh: "开始我的拍摄",
    ko: "내 차례 시작",
  },
  "waiting.waitingOthers": {
    en: "Waiting for the others...",
    zh: "等待其他人完成...",
    ko: "다른 사람을 기다리는 중...",
  },
  "waiting.allSubmitted": {
    en: "All done. Making the strip...",
    zh: "全部完成，正在生成相纸...",
    ko: "모두 완료. 스트립을 만드는 중...",
  },
  "waiting.bothReady": {
    en: "Both ready to capture",
    zh: "双方都准备好了",
    ko: "둘 다 촬영 준비 완료",
  },
  "waiting.invitePartner": {
    en: "Invite your partner",
    zh: "邀请对方加入",
    ko: "파트너를 초대하세요",
  },

  "join.enterName": {
    en: "Your name",
    zh: "你的名字",
    ko: "이름",
  },
  "join.join": {
    en: "Join room",
    zh: "加入房间",
    ko: "방 입장",
  },
  "join.guest": {
    en: "Guest",
    zh: "访客",
    ko: "게스트",
  },
  "join.full": {
    en: "Room is full",
    zh: "房间已满",
    ko: "방이 가득 찼어요",
  },

  "ghost.segmenting": {
    en: "Cutting portraits...",
    zh: "正在抠出人像...",
    ko: "인물을 분리하는 중...",
  },
  "ghost.previewTitle": {
    en: "Check your cutouts",
    zh: "检查人像抠图",
    ko: "컷아웃 확인",
  },
  "ghost.looksGood": {
    en: "Looks good",
    zh: "看起来不错",
    ko: "좋아요",
  },
  "ghost.retakeThis": {
    en: "Retake",
    zh: "重拍",
    ko: "다시 찍기",
  },
  "ghost.captureGuidePose": {
    en: "Capture your guide pose",
    zh: "先拍一组对位参考",
    ko: "가이드 포즈를 먼저 찍어주세요",
  },
  "ghost.alignPartner": {
    en: "Align with your partner",
    zh: "和对方轮廓对齐",
    ko: "파트너 윤곽에 맞춰주세요",
  },
  "ghost.on": {
    en: "On",
    zh: "开启",
    ko: "켜짐",
  },
  "ghost.guide": {
    en: "Guide",
    zh: "参考",
    ko: "가이드",
  },
  "ghost.partnerReference": {
    en: "Partner pose reference",
    zh: "对方姿势参考",
    ko: "파트너 포즈 참고",
  },
  "ghost.partnerGuide": {
    en: "Partner pose guide",
    zh: "对方对位指引",
    ko: "파트너 포즈 가이드",
  },

  "status.done": {
    en: "Done",
    zh: "完成",
    ko: "완료",
  },
  "status.shooting": {
    en: "Shooting",
    zh: "拍摄中",
    ko: "촬영 중",
  },
  "status.selecting": {
    en: "Choosing",
    zh: "选片中",
    ko: "선택 중",
  },
  "status.ready": {
    en: "Ready",
    zh: "就绪",
    ko: "준비",
  },

  "error.cloudSync": {
    en: "Strip is ready. Cloud sync is not available yet, so save it before leaving.",
    zh: "相纸已经生成。云端同步暂不可用，请离开前先保存。",
    ko: "스트립이 완성되었어요. 클라우드 동기화를 사용할 수 없으니 나가기 전에 저장해주세요.",
  },
  "error.composite": {
    en: "Could not make the strip.",
    zh: "暂时无法生成相纸。",
    ko: "스트립을 만들 수 없어요.",
  },
  "error.refreshStrip": {
    en: "Could not refresh the strip.",
    zh: "暂时无法刷新相纸。",
    ko: "스트립을 새로 만들 수 없어요.",
  },
  "error.selectPhotos": {
    en: "Select the required photos before upload.",
    zh: "请先选满需要的照片。",
    ko: "업로드 전에 필요한 사진을 모두 선택해주세요.",
  },
  "error.capture": {
    en: "Could not capture photos. Please try again.",
    zh: "暂时无法拍摄照片，请再试一次。",
    ko: "사진을 촬영할 수 없어요. 다시 시도해주세요.",
  },
  "ghost.fallbackNotice": {
    en: "Some frames will use a clean split-frame fallback.",
    zh: "部分画面会使用干净的左右分屏备用效果。",
    ko: "일부 컷은 깔끔한 분할 프레임으로 처리돼요.",
  },
} as const;

export type TranslationKey = keyof typeof translations;

export function detectLocale(): Locale {
  if (typeof navigator === "undefined") return "en";

  const lang = navigator.language.toLowerCase();
  if (lang.startsWith("zh")) return "zh";
  if (lang.startsWith("ko")) return "ko";
  return "en";
}

export function isLocale(value: string | null): value is Locale {
  return value === "en" || value === "zh" || value === "ko";
}

export function t(key: TranslationKey, locale: Locale): string {
  const entry = translations[key];
  return entry[locale] || entry.en;
}

export const LOCALE_LABELS: { id: Locale; label: string }[] = [
  { id: "en", label: "EN" },
  { id: "zh", label: "中" },
  { id: "ko", label: "한" },
];
