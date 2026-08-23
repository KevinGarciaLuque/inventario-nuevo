// Agrupa las categorías planas (con categoria_padre_id) en <optgroup> por
// categoría principal, para usarse dentro de un <select>/<Form.Select>.
export function renderCategoriaOptions(categorias) {
  const principales = categorias
    .filter((c) => !c.categoria_padre_id)
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  const porPadre = {};
  categorias.forEach((c) => {
    if (c.categoria_padre_id) {
      (porPadre[c.categoria_padre_id] ||= []).push(c);
    }
  });
  Object.values(porPadre).forEach((arr) =>
    arr.sort((a, b) => a.nombre.localeCompare(b.nombre)),
  );

  return principales.map((padre) => {
    const hijos = porPadre[padre.id] || [];
    if (hijos.length === 0) {
      return (
        <option key={padre.id} value={padre.id}>
          {padre.nombre}
        </option>
      );
    }
    return (
      <optgroup key={padre.id} label={padre.nombre}>
        <option value={padre.id}>{padre.nombre} (general)</option>
        {hijos.map((hijo) => (
          <option key={hijo.id} value={hijo.id}>
            {hijo.nombre}
          </option>
        ))}
      </optgroup>
    );
  });
}
