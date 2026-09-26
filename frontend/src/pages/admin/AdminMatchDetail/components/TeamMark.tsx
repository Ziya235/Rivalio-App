import { mediaUrl } from "../../../../api/base";
import { teamInitialTone } from "../../../../lib/teamAvatar";

export function TeamMark({ name, logo }: { name: string; logo: string | null }) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      {logo ? (
        <img
          src={mediaUrl(logo)}
          alt=""
          className="h-14 w-14 shrink-0 rounded-full object-cover shadow ring-2 ring-white"
        />
      ) : (
        <span
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-lg font-bold shadow ring-2 ring-white ${teamInitialTone(name)}`}
        >
          {name.slice(0, 1).toUpperCase()}
        </span>
      )}
      <span className="max-w-[9rem] text-sm font-bold text-ink sm:max-w-[12rem]">{name}</span>
    </div>
  );
}
