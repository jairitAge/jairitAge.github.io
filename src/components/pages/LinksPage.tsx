'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import { LinksPageConfig, LinkItem } from '@/types/page';

function initialsFor(name: string) {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() || '')
        .join('');
}

const markdownComponents = {
    p: ({ children }: React.ComponentProps<'p'>) => <p className="mb-3 last:mb-0">{children}</p>,
    ul: ({ children }: React.ComponentProps<'ul'>) => <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>,
    ol: ({ children }: React.ComponentProps<'ol'>) => <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>,
    li: ({ children }: React.ComponentProps<'li'>) => <li className="mb-1">{children}</li>,
    a: ({ ...props }) => (
        <a
            {...props}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent font-medium hover:underline"
        />
    ),
    code: ({ children }: React.ComponentProps<'code'>) => (
        <code className="px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-[0.95em] break-all">{children}</code>
    ),
    strong: ({ children }: React.ComponentProps<'strong'>) => <strong className="font-semibold text-primary">{children}</strong>,
};

function LinkCard({ item, idx }: { item: LinkItem; idx: number }) {
    return (
        <motion.a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 * idx }}
            className="flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm hover:shadow-lg hover:scale-[1.02] transition-all duration-200"
        >
            <div className="flex-shrink-0 w-14 h-14 rounded-full overflow-hidden bg-accent/10 flex items-center justify-center">
                {item.avatar ? (
                    <Image
                        src={item.avatar}
                        alt={item.name}
                        width={56}
                        height={56}
                        className="object-cover w-full h-full"
                    />
                ) : (
                    <span className="text-accent font-semibold text-lg">{initialsFor(item.name)}</span>
                )}
            </div>
            <div className="min-w-0 flex-1">
                <div className="font-semibold text-primary truncate">{item.name}</div>
                {item.affiliation && (
                    <div className="text-sm text-neutral-600 dark:text-neutral-500 truncate">{item.affiliation}</div>
                )}
                <div className="text-xs text-accent truncate">{item.url.replace(/^https?:\/\//, '')}</div>
            </div>
        </motion.a>
    );
}

export default function LinksPage({ config, embedded = false }: { config: LinksPageConfig; embedded?: boolean }) {
    const sections = config.sections ?? (config.items ? [{ items: config.items }] : []);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
        >
            <div className={embedded ? 'mb-4' : 'mb-8'}>
                <h1 className={`${embedded ? 'text-2xl' : 'text-4xl'} font-serif font-bold text-primary mb-4`}>{config.title}</h1>
                {config.description && (
                    <p className={`${embedded ? 'text-base' : 'text-lg'} text-neutral-600 dark:text-neutral-500 max-w-2xl leading-relaxed`}>
                        {config.description}
                    </p>
                )}
            </div>

            <div className="space-y-10">
                {sections.map((section, sIdx) => (
                    <section key={sIdx}>
                        {section.title && (
                            <h2 className="text-xl font-semibold text-primary mb-4 border-b border-neutral-200 dark:border-neutral-800 pb-2">
                                {section.title}
                            </h2>
                        )}
                        {section.items && section.items.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {section.items.map((item, idx) => (
                                    <LinkCard key={idx} item={item} idx={idx} />
                                ))}
                            </div>
                        )}
                        {section.markdown && (
                            <div className="text-neutral-700 dark:text-neutral-500 leading-relaxed">
                                <ReactMarkdown components={markdownComponents}>{section.markdown}</ReactMarkdown>
                            </div>
                        )}
                    </section>
                ))}
            </div>
        </motion.div>
    );
}
