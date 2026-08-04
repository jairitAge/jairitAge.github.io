export interface LocaleMessages {
  common: {
    all: string;
    copyToClipboard: string;
  };
  navigation: {
    openMainMenu: string;
  };
  theme: {
    system: string;
    light: string;
    dark: string;
    currentTheme: string;
    cycleTheme: string;
  };
  profile: {
    email: string;
    location: string;
    workAddress: string;
    click: string;
    googleMap: string;
    send: string;
    sendEmail: string;
    researchInterests: string;
    like: string;
    liked: string;
    thanks: string;
  };
  home: {
    about: string;
    news: string;
    selectedPublications: string;
    viewAll: string;
  };
  publications: {
    searchPlaceholder: string;
    filters: string;
    year: string;
    type: string;
    noResults: string;
    abstract: string;
    bibtex: string;
    code: string;
  };
  archive: {
    searchPlaceholder: string;
    noResults: string;
    backToArchive: string;
    viewSource: string;
    noNotesYet: string;
    authors: string;
    venue: string;
    location: string;
    date: string;
    tags: string;
  };
  footer: {
    lastUpdated: string;
    builtWithPrism: string;
    visitors: string;
  };
  visitors: {
    title: string;
    description: string;
    totalVisits: string;
    uniqueVisitors: string;
    today: string;
    countries: string;
    cities: string;
    mapTitle: string;
    mapNote: string;
    topCountries: string;
    topCities: string;
    visitsFrom: string;
    citiesSuffix: string;
    unavailable: string;
    empty: string;
  };
}

const en: LocaleMessages = {
  common: {
    all: 'All',
    copyToClipboard: 'Copy to clipboard',
  },
  navigation: {
    openMainMenu: 'Open main menu',
  },
  theme: {
    system: 'System',
    light: 'Light',
    dark: 'Dark',
    currentTheme: 'Current theme',
    cycleTheme: 'Click to cycle theme',
  },
  profile: {
    email: 'Email',
    location: 'Location',
    workAddress: 'Work Address',
    click: 'Click',
    googleMap: 'Google Map',
    send: 'Send',
    sendEmail: 'Send Email',
    researchInterests: 'Research Interests',
    like: 'Like',
    liked: 'Liked',
    thanks: 'Thanks!',
  },
  home: {
    about: 'About',
    news: 'News',
    selectedPublications: 'Selected Publications',
    viewAll: 'View All',
  },
  publications: {
    searchPlaceholder: 'Search publications...',
    filters: 'Filters',
    year: 'Year',
    type: 'Type',
    noResults: 'No publications found matching your criteria.',
    abstract: 'Abstract',
    bibtex: 'BibTeX',
    code: 'Code',
  },
  archive: {
    searchPlaceholder: 'Search by title, author, venue, tag, or summary...',
    noResults: 'No entries match your search.',
    backToArchive: 'Back to Archive',
    viewSource: 'View source',
    noNotesYet: 'Notes coming soon.',
    authors: 'Authors',
    venue: 'Venue',
    location: 'Location',
    date: 'Date',
    tags: 'Tags',
  },
  footer: {
    lastUpdated: 'Last updated',
    builtWithPrism: 'Built with PRISM',
    visitors: 'Visitors',
  },
  visitors: {
    title: 'Visitors',
    description: 'Where the people reading this site come from.',
    totalVisits: 'Total visits',
    uniqueVisitors: 'Unique visitors',
    today: 'Today',
    countries: 'Countries',
    cities: 'Cities',
    mapTitle: 'Visitor map',
    mapNote: 'Each dot is a city; larger dots mean more visits. Locations are rounded to about 11km.',
    topCountries: 'Top countries',
    topCities: 'Top cities',
    visitsFrom: 'visits from',
    citiesSuffix: 'cities',
    unavailable: 'Visitor stats are unavailable right now.',
    empty: 'No visits recorded yet.',
  },
};

const zh: LocaleMessages = {
  common: {
    all: '全部',
    copyToClipboard: '复制到剪贴板',
  },
  navigation: {
    openMainMenu: '打开主菜单',
  },
  theme: {
    system: '跟随系统',
    light: '浅色',
    dark: '深色',
    currentTheme: '当前主题',
    cycleTheme: '点击切换主题',
  },
  profile: {
    email: '邮箱',
    location: '地址',
    workAddress: '办公地址',
    click: '点击',
    googleMap: '谷歌地图',
    send: '发送',
    sendEmail: '发送邮件',
    researchInterests: '研究兴趣',
    like: '点赞',
    liked: '已点赞',
    thanks: '感谢支持！',
  },
  home: {
    about: '关于我',
    news: '动态',
    selectedPublications: '精选论文',
    viewAll: '查看全部',
  },
  publications: {
    searchPlaceholder: '搜索论文...',
    filters: '筛选',
    year: '年份',
    type: '类型',
    noResults: '没有找到符合条件的论文。',
    abstract: '摘要',
    bibtex: 'BibTeX',
    code: '代码',
  },
  archive: {
    searchPlaceholder: '按标题、作者、会议、标签或摘要搜索…',
    noResults: '没有匹配的条目。',
    backToArchive: '返回归档',
    viewSource: '查看原文',
    noNotesYet: '笔记即将上线。',
    authors: '作者',
    venue: '发表',
    location: '地点',
    date: '日期',
    tags: '标签',
  },
  footer: {
    lastUpdated: '最近更新',
    builtWithPrism: '由 PRISM 构建',
    visitors: '访客地图',
  },
  visitors: {
    title: '访客地图',
    description: '看看都有谁在读这个站点。',
    totalVisits: '总访问',
    uniqueVisitors: '独立访客',
    today: '今日',
    countries: '国家/地区',
    cities: '城市',
    mapTitle: '访客分布',
    mapNote: '每个点是一座城市，点越大访问越多。位置精度约 11 公里。',
    topCountries: '国家/地区排行',
    topCities: '城市排行',
    visitsFrom: '次访问，来自',
    citiesSuffix: '座城市',
    unavailable: '访客统计暂时不可用。',
    empty: '还没有访问记录。',
  },
};

export const messages: Record<string, LocaleMessages> = {
  en,
  zh,
};

export function getMessages(locale: string): LocaleMessages {
  return messages[locale] || en;
}
