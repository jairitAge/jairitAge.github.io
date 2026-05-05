export interface BasePageConfig {
    type: 'about' | 'publication' | 'card' | 'text' | 'links' | 'archive';
    title: string;
    description?: string;
}

export interface PublicationPageConfig extends BasePageConfig {
    type: 'publication';
    source: string;
}

export interface TextPageConfig extends BasePageConfig {
    type: 'text';
    source: string;
}

export interface CardItem {
    title: string;
    subtitle?: string;
    date?: string;
    location?: string;
    content?: string;
    tags?: string[];
    link?: string;
    image?: string;
}

export interface CardPageConfig extends BasePageConfig {
    type: 'card';
    items: CardItem[];
}

export interface LinkItem {
    name: string;
    affiliation?: string;
    url: string;
    avatar?: string;
}

export interface LinksSection {
    title?: string;
    items?: LinkItem[];
    markdown?: string;
}

export interface LinksPageConfig extends BasePageConfig {
    type: 'links';
    items?: LinkItem[];
    sections?: LinksSection[];
}

export interface ArchiveItem {
    slug?: string;
    title: string;
    authors?: string;
    venue?: string;
    date?: string;
    location?: string;
    tags?: string[];
    summary?: string;
    link?: string;
}

export interface ArchivePageConfig extends BasePageConfig {
    type: 'archive';
    items: ArchiveItem[];
}
