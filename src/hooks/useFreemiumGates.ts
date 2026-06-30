// All freemium gates removed — everything is unlimited for every user.
export const useFreemiumGates = () => ({
  isFree: false,
  canAddClosetItem: true,
  canCreateLook: true,
  closetRemaining: Infinity,
  looksRemaining: Infinity,
  closetLimit: Infinity,
  looksLimit: Infinity,
  closetCount: 0,
  looksThisMonth: 0,
});
