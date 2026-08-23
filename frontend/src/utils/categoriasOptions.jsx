// Agrupa las categorías planas (con categoria_padre_id, hasta 3 niveles:
// categoría > subcategoría > sub-subcategoría) en <optgroup> por categoría
// principal, para usarse dentro de un <select>/<Form.Select>. Un <select>
// nativo solo soporta un nivel de <optgroup>, así que el 2do y 3er nivel se
// muestran indentados con guiones dentro del mismo grupo.
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

  // Aplana un nodo y sus descendientes en <option> indentadas por nivel
  const renderRama = (nodo, nivel) => {
    const hijos = porPadre[nodo.id] || [];
    const prefijo = nivel > 0 ? `${"— ".repeat(nivel)}` : "";
    const opciones = [
      <option key={nodo.id} value={nodo.id}>
        {prefijo}
        {nodo.nombre}
        {nivel === 0 && hijos.length > 0 ? " (general)" : ""}
      </option>,
    ];
    hijos.forEach((hijo) => {
      opciones.push(...renderRama(hijo, nivel + 1));
    });
    return opciones;
  };

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
        {renderRama(padre, 0)}
      </optgroup>
    );
  });
}
