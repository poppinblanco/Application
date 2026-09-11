export default function TopBar({ title, sub, right, tag, tagClass }) {
  return (
    <div className="topbar">
      <div>
        {tag && <div className={`module-tag ${tagClass || 'm-clients-bg'}`}>{tag}</div>}
        <h1>{title}</h1>
        {sub && <div className="sub">{sub}</div>}
      </div>
      {right}
    </div>
  );
}
