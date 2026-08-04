'use client';

import { motion } from 'framer-motion';
import VisitorsDashboard from './VisitorsDashboard';
import { useMessages } from '@/lib/i18n/useMessages';

export default function VisitorsPageClient({ endpoint }: { endpoint: string }) {
  const messages = useMessages();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <h1 className="text-4xl font-serif font-bold text-primary mb-4">{messages.visitors.title}</h1>
        <p className="text-lg text-neutral-600 dark:text-neutral-500 max-w-2xl leading-relaxed mb-10">
          {messages.visitors.description}
        </p>
      </motion.div>
      <VisitorsDashboard endpoint={endpoint} />
    </div>
  );
}
