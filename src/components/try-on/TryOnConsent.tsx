export default function TryOnConsent({ allowed, onChange }: { allowed: boolean; onChange: (allowed: boolean) => void }) {
  return <div className="rounded-xl border border-border bg-secondary/20 p-4 space-y-3">
    <p className="text-sm font-medium">Your photos, your choice</p>
    <p className="text-sm text-muted-foreground">Creating a preview sends your selected body or avatar photo, clothing images and avatar settings to Google Gemini. Your original photo stays in this session unless you choose to create a preview. Generated avatars are saved on this device only when you tap Save avatar. Google processes submitted images under its service terms.</p>
    <label className="flex items-start gap-3 cursor-pointer text-sm leading-relaxed"><input type="checkbox" checked={allowed} onChange={event => onChange(event.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-primary" />I am 18 or older, this is my own photo, and I allow these images and settings to be sent to Google Gemini for this preview.</label>
  </div>;
}
