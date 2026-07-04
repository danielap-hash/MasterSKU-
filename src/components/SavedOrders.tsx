import React from 'react';
import { OrderItem } from '../types';
import { formatPrice } from '../utils';
import { ShoppingCart, Trash2, Printer, ArrowLeft, Download, FileText } from 'lucide-react';

interface SavedOrdersProps {
  orderItems: OrderItem[];
  onClearOrder: () => void;
  onUpdateQuantity: (code: string, qty: number) => void;
  onBackToReplenishment: () => void;
}

export default function SavedOrders({
  orderItems,
  onClearOrder,
  onUpdateQuantity,
  onBackToReplenishment
}: SavedOrdersProps) {
  
  const totalAmount = orderItems.reduce((sum, item) => sum + (item.precioLista * item.cantidadPedir), 0);
  const totalItems = orderItems.reduce((sum, item) => sum + item.cantidadPedir, 0);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const headers = ['Proveedor', 'Codigo Interno', 'Codigo Proveedor', 'EAN', 'Descripcion', 'Precio de Lista', 'Cantidad a Pedir', 'Subtotal'];
    const rows = orderItems.map(item => [
      `"${item.proveedor.replace(/"/g, '""')}"`,
      `"${item.codigoProducto}"`,
      `"${item.codProveedor}"`,
      `"${item.ultimoEan}"`,
      `"${item.descripcion.replace(/"/g, '""')}"`,
      item.precioLista.toFixed(2).replace('.', ','),
      item.cantidadPedir,
      (item.precioLista * item.cantidadPedir).toFixed(2).replace('.', ',')
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Nota_Pedido_MaestroSKU_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6" id="saved-orders-root">
      
      {/* Header action bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <button
          onClick={onBackToReplenishment}
          className="px-4 py-2 text-sm font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg flex items-center gap-2 transition-colors focus:outline-none"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Lista de Reposición
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            disabled={orderItems.length === 0}
            className="px-4 py-2 text-sm font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 disabled:pointer-events-none rounded-lg flex items-center gap-2 transition-colors focus:outline-none"
          >
            <Download className="w-4 h-4" />
            Descargar CSV (Excel)
          </button>
          <button
            onClick={handlePrint}
            disabled={orderItems.length === 0}
            className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:pointer-events-none rounded-lg flex items-center gap-2 transition-colors focus:outline-none"
          >
            <Printer className="w-4 h-4" />
            Imprimir Nota
          </button>
          <button
            onClick={onClearOrder}
            disabled={orderItems.length === 0}
            className="px-4 py-2 text-sm font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 disabled:opacity-50 disabled:pointer-events-none rounded-lg flex items-center gap-2 transition-colors focus:outline-none"
          >
            <Trash2 className="w-4 h-4" />
            Vaciar Pedido
          </button>
        </div>
      </div>

      {orderItems.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-16 text-center text-slate-500 shadow-sm">
          <ShoppingCart className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-700">No hay pedido activo</h3>
          <p className="text-sm mt-1 max-w-sm mx-auto">
            Ingrese cantidades en la solapa de Reposición y presione "Guardar Pedido" para confeccionar la nota de compra.
          </p>
          <button
            onClick={onBackToReplenishment}
            className="mt-6 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-sm transition-all shadow-sm focus:outline-none"
          >
            Ir a Reposición
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Order Details list */}
          <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <span className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                Resumen de Pedido de Compra
              </span>
              <span className="text-xs bg-indigo-600 px-3 py-1 rounded-full font-bold">
                {orderItems.length} Líneas
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Proveedor</th>
                    <th className="py-3 px-4">Códigos</th>
                    <th className="py-3 px-4">Descripción del Producto</th>
                    <th className="py-3 px-4 text-right">P. Lista</th>
                    <th className="py-3 px-4 text-center">Cantidad</th>
                    <th className="py-3 px-4 text-right">Subtotal</th>
                    <th className="py-3 px-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 text-sm">
                  {orderItems.map((item) => (
                    <tr key={item.codigoProducto} className="hover:bg-slate-50/50">
                      <td className="py-4 px-4">
                        <span className="font-semibold text-slate-800 text-xs block">
                          {item.proveedor}
                        </span>
                      </td>
                      <td className="py-4 px-4 font-mono text-xs text-slate-500 space-y-0.5">
                        <div>Int: <span className="font-bold text-slate-800">{item.codigoProducto}</span></div>
                        <div>Prov: {item.codProveedor}</div>
                        <div>EAN: {item.ultimoEan}</div>
                      </td>
                      <td className="py-4 px-4 font-medium text-slate-900">
                        {item.descripcion}
                      </td>
                      <td className="py-4 px-4 text-right font-mono">
                        {formatPrice(item.precioLista)}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-center">
                          <input
                            type="number"
                            min="0"
                            value={item.cantidadPedir}
                            onChange={(e) => onUpdateQuantity(item.codigoProducto, parseInt(e.target.value) || 0)}
                            className="w-16 py-1 px-1.5 text-center font-bold bg-slate-50 border border-slate-300 rounded text-slate-900 font-mono shadow-sm"
                          />
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right font-mono font-bold text-slate-900">
                        {formatPrice(item.precioLista * item.cantidadPedir)}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <button
                          onClick={() => onUpdateQuantity(item.codigoProducto, 0)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded transition-colors"
                          title="Quitar ítem"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals Summary sidebar */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
              <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3">
                Resumen de Totales
              </h3>

              <div className="space-y-3.5 text-sm">
                <div className="flex justify-between items-center text-slate-500">
                  <span>Líneas de Producto</span>
                  <span className="font-bold text-slate-800">{orderItems.length}</span>
                </div>
                <div className="flex justify-between items-center text-slate-500">
                  <span>Unidades Totales a Pedir</span>
                  <span className="font-bold text-slate-800 font-mono">{totalItems} u</span>
                </div>
                <div className="flex justify-between items-center text-slate-500">
                  <span>Moneda</span>
                  <span className="font-bold text-slate-800">Pesos ($)</span>
                </div>
                
                <div className="pt-4 border-t border-slate-100 flex justify-between items-end">
                  <span className="text-sm font-bold text-slate-700">VALOR ESTIMADO</span>
                  <div className="text-right">
                    <p className="text-2xl font-bold font-mono text-indigo-700 leading-none">
                      {formatPrice(totalAmount)}
                    </p>
                    <span className="text-[10px] text-slate-400">Precio de Lista sin IVA</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-100 p-4 rounded-lg text-xs text-slate-500 space-y-2">
                <p className="font-bold text-slate-700">📌 Información de Envío</p>
                <p>
                  Esta nota se puede exportar en formato CSV que es directamente compatible con Microsoft Excel, Google Sheets, o sistemas ERP de abastecimiento.
                </p>
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
