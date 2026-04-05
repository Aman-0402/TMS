function PageHeader({ title, description }) {
  return (
    <div className="mb-4">
      <h1 className="h3 mb-2">{title}</h1>
      <p className="text-secondary mb-0">{description}</p>
    </div>
  );
}

export default PageHeader;
