import { useQuery } from '@tanstack/react-query';
import { loadAvatar } from '@/lib/avatar-store';

export function useSavedAvatar(userId?: string) {
  return useQuery({
    queryKey: ['saved-avatar', userId],
    enabled: Boolean(userId),
    queryFn: () => loadAvatar(userId!),
    staleTime: 0,
    retry: false,
  });
}
