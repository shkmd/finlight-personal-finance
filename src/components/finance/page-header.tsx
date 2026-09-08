export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end gap-4">
      <div className="min-w-0 flex-[1_1_260px]">
        <h1 className="text-[30px] font-extrabold tracking-[-0.035em]">{title}</h1>
        {description ? <p className="mt-1 text-[13.5px] font-medium text-(--fl-muted)">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2.25">{actions}</div> : null}
    </div>
  );
}
