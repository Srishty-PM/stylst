import { useAuth } from '@/contexts/AuthContext';
import { useClosetItems } from '@/hooks/useClosetItems';
import { useLooks } from '@/hooks/useLooks';
import { startOfMonth, format } from 'date-fns';

const FREE_CLOSET_LIMIT = 20;
const FREE_LOOKS_PER_MONTH = 3;

export const useFreemiumGates = () => {
  const { profile } = useAuth();
  const { data: closetItems } = useClosetItems();
  const { data: looks } = useLooks();

  const isFree = profile?.subscription_tier === 'free';
  const closetCount = closetItems?.length ?? 0;

  // Count manually created looks this month
  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const looksThisMonth = looks?.filter(
    l => !l.created_by_ai && l.created_at >= monthStart
  ).length ?? 0;

  const canAddClosetItem = !isFree || closetCount < FREE_CLOSET_LIMIT;
  const canCreateLook = !isFree || looksThisMonth < FREE_LOOKS_PER_MONTH;
  const closetRemaining = isFree ? Math.max(0, FREE_CLOSET_LIMIT - closetCount) : Infinity;
  const looksRemaining = isFree ? Math.max(0, FREE_LOOKS_PER_MONTH - looksThisMonth) : Infinity;

  return {
    isFree,
    canAddClosetItem,
    canCreateLook,
    closetRemaining,
    looksRemaining,
    closetLimit: FREE_CLOSET_LIMIT,
    looksLimit: FREE_LOOKS_PER_MONTH,
    closetCount,
    looksThisMonth,
  };
};
