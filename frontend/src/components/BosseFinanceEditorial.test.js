import { groupFinanceDays } from './BosseFinanceEditorial';
test('agrupa semanas y conserva los importes de las vistas, sin duplicar la nómina', () => {
 const result=groupFinanceDays([
  {fecha_financiera:'2026-11-05',ingresos:120,egresos:60,gm:60},
  {fecha_financiera:'2026-11-06',ingresos:140,egresos:40,gm:100}
 ],'semana');
 expect(result).toHaveLength(2);
 expect(result[0].ingresos).toBe(120);
 expect(result[1].gpm).toBeCloseTo(100/140*100);
});
test('agregación diaria no convierte dos veces GM ni crea ingresos a partir de métodos de cobro', () => {
 const result=groupFinanceDays([{fecha_financiera:'2026-11-03',ingresos:500,egresos:180,gm:320}], 'dia');
 expect(result[0].gm).toBe(320);
 expect(result[0].gpm).toBe(64);
});

test('una semana financiera inicia viernes y termina jueves',()=>{
 const rows=groupFinanceDays([{fecha_financiera:'2026-11-05',ingresos:20,egresos:10},{fecha_financiera:'2026-11-06',ingresos:30,egresos:10}], 'semana');
 expect(rows[0].key).toBe('2026-10-30');expect(rows[1].key).toBe('2026-11-06');
});

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import BosseFinanceEditorial from './BosseFinanceEditorial';
import { financialDate } from '../utils/financialDate';

test('fecha operativa respeta el cierre local de Tijuana',()=>{
 expect(financialDate(new Date('2026-11-05T12:59:00Z'))).toBe('2026-11-04');
 expect(financialDate(new Date('2026-11-05T13:00:00Z'))).toBe('2026-11-05');
 expect(financialDate(new Date('2026-07-05T12:00:00Z'))).toBe('2026-07-05');
});

const fixture={resumen:{total_ingresos:1000,total_egresos:201,gm:799,gpm:79.9,total_nomina:0,total_egresos_operativos:201},ingresos_detalle:[],egresos_detalle:[{egreso_id:1,concepto:'Lavado',categoria:'Servicios',proveedor:'Prueba Uno',monto_mxn:103,fecha_financiera:'2026-11-02',estatus:'REGISTRADO'},{egreso_id:2,concepto:'Caja',categoria:'Insumos',monto_mxn:98,fecha_financiera:'2026-11-02',estatus:'REGISTRADO'}]};
const props={analisis:fixture,fechaInicio:'2026-11-01',fechaFin:'2026-11-05'};
test('Resúmen abre secciones completas sin mostrar todas por defecto',()=>{
 render(<BosseFinanceEditorial {...props}/>);
 const socios=screen.getByRole('button',{name:/Distribución por socio/});
 expect(socios).toHaveAttribute('aria-expanded','false');
 fireEvent.click(socios);
 expect(socios).toHaveAttribute('aria-expanded','true');
 fireEvent.click(screen.getByRole('button',{name:/Resultado cambiario/}));
 expect(socios).toHaveAttribute('aria-expanded','false');
});
test('categoría filtra movimientos y detalle conserva trazabilidad',()=>{
 render(<BosseFinanceEditorial {...props} activeSection="explorar"/>);
 fireEvent.change(screen.getByLabelText('Categoría'),{target:{value:'Servicios'}});
 const table=screen.getByRole('table');
 expect(within(table).getByText('Lavado')).toBeInTheDocument();
 expect(within(table).queryByText('Caja')).not.toBeInTheDocument();
 fireEvent.click(within(table).getByRole('button',{name:/Ver detalle de/}));
 expect(within(screen.getByRole('dialog')).getByText('Prueba Uno')).toBeInTheDocument();
 fireEvent.keyDown(document,{key:'Escape'});
 expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
test('privacidad oculta los importes y la conversación',()=>{
 render(<BosseFinanceEditorial {...props} activeSection="borderbro" borderBroAbierto chat={<div>Importe confidencial</div>}/>);
 expect(screen.getByText('Importe confidencial')).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:/Privacidad/}));
 expect(screen.queryByText('Importe confidencial')).not.toBeInTheDocument();
 expect(screen.queryByText('$103.00')).not.toBeInTheDocument();
 expect(screen.getByRole('button',{name:/Excel de borderbro/})).toBeDisabled();
});


test('Resumen abre egresos y filtra por categoría sin salir de Análisis Financiero', () => {
  render(<BosseFinanceEditorial {...props} />);
  expect(screen.getByText('¿Qué conforma estos números?')).toBeInTheDocument();
  expect(screen.queryByText('Lavado')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Ver desglose de Egresos/i }));
  expect(screen.getByText('Lavado')).toBeInTheDocument();
  expect(screen.getByText('Caja')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Servicios.*103/i }));
  expect(screen.getByText('Lavado')).toBeInTheDocument();
  expect(screen.queryByText('Caja')).not.toBeInTheDocument();
  expect(screen.getByText(/Coincide con el total oficial/)).toBeInTheDocument();
});

test('El desglose del GM conserva el total oficial y presenta sus componentes', () => {
  render(<BosseFinanceEditorial {...props}/>);
  fireEvent.click(screen.getByRole('button', { name: /Ver desglose de GM/i }));
  expect(screen.getByText('De dónde sale el margen')).toBeInTheDocument();
  expect(screen.getByText('GM · Ganancia calculada por BOSSE')).toBeInTheDocument();
  expect(screen.getByText(/La fórmula concuerda con el GM oficial/)).toBeInTheDocument();
});
