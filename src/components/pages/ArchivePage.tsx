'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { MagnifyingGlassIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import ReactMarkdown from 'react-markdown';
import { ArchivePageConfig, ArchiveItem } from '@/types/page';
import { useMessages } from '@/lib/i18n/useMessages';

const markdownComponents = {
    p: ({ children }: React.ComponentProps<'p'>) => <p className="mb-2 last:mb-0">{children}</p>,
    a: ({ ...props }) => (
        <a
            {...props}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent font-medium transition-all duration-200 rounded hover:bg-accent/10 hover:shadow-sm"
        />
    ),
    strong: ({ children }: React.ComponentProps<'strong'>) => <strong className="font-semibold text-primary">{children}</strong>,
    em: ({ children }: React.ComponentProps<'em'>) => <em className="italic">{children}</em>,
    code: ({ children }: React.ComponentProps<'code'>) => (
        <code className="px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-[0.95em]">{children}</code>
    ),
};

function itemMatches(item: ArchiveItem, query: string): boolean {
    if (!query) return true;
    const q = query.toLowerCase();
    const haystack = [
        item.title,
        item.authors,
        item.venue,
        item.date,
        item.summary,
        ...(item.tags || []),
    ]
        .filter(Boolean)
        .join('  ')
        .toLowerCase();
    return haystack.includes(q);
}

export default function ArchivePage({ config }: { config: ArchivePageConfig }) {
    const [query, setQuery] = useState('');
    const t = useMessages();

    const filtered = useMemo(
        () => (config.items || []).filter((item) => itemMatches(item, query.trim())),
        [config.items, query]
    );

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
        >
            <div className="mb-8">
                <h1 className="text-4xl font-serif font-bold text-primary mb-4">{config.title}</h1>
                {config.description && (
                    <p className="text-lg text-neutral-600 dark:text-neutral-500 max-w-2xl leading-relaxed">
                        {config.description}
                    </p>
                )}
            </div>

            <div className="relative mb-8">
                <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
                <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t.archive.searchPlaceholder}
                    className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 pl-10 pr-4 py-3 text-base text-primary placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/60 transition-all"
                />
            </div>

            <div className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
                {filtered.length} / {config.items?.length || 0}
            </div>

            <div className="grid gap-4">
                {filtered.map((item, index) => (
                    <motion.div
                        key={`${item.title}-${index}`}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: Math.min(0.05 * index, 0.3) }}
                        className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-800 hover:shadow-lg transition-all duration-200 hover:scale-[1.005] p-5"
                    >
                        <div className="flex justify-between items-start mb-1.5 gap-3">
                            <h3 className="text-lg font-semibold text-primary leading-snug">
                                {item.link ? (
                                    <a
                                        href={item.link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 hover:text-accent transition-colors"
                                    >
                                        {item.title}
                                        <ArrowTopRightOnSquareIcon className="h-4 w-4 opacity-60" />
                                    </a>
                                ) : (
                                    item.title
                                )}
                            </h3>
                            {item.date && (
                                <span className="text-sm text-neutral-500 font-medium bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded whitespace-nowrap">
                                    {item.date}
                                </span>
                            )}
                        </div>
                        {(item.authors || item.venue) && (
                            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">
                                {item.authors}
                                {item.authors && item.venue && <span className="mx-1.5">·</span>}
                                {item.venue && <span className="italic">{item.venue}</span>}
                            </p>
                        )}
                        {item.summary && (
                            <div className="text-base text-neutral-600 dark:text-neutral-500 leading-relaxed">
                                <ReactMarkdown components={markdownComponents}>
                                    {item.summary}
                                </ReactMarkdown>
                            </div>
                        )}
                        {item.tags && item.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3">
                                {item.tags.map((tag) => (
                                    <span
                                        key={tag}
                                        className="text-xs text-neutral-500 bg-neutral-50 dark:bg-neutral-800/50 px-2 py-1 rounded border border-neutral-100 dark:border-neutral-800"
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}
                    </motion.div>
                ))}

                {filtered.length === 0 && (
                    <div className="text-center py-12 text-neutral-500 dark:text-neutral-400">
                        {t.archive.noResults}
                    </div>
                )}
            </div>
        </motion.div>
    );
}
