export type RolUsuario =
  | "ADMINISTRADOR"
  | "GERENCIA"
  | "INVENTARIO"
  | "PRODUCCION"
  | "DISTRIBUCION"
  | "CALIDAD";

export type OrigenDato = "RECOPILADO" | "ESTIMADO" | "REAL_FUTURO";

export type LineaProducto = "HERVIDOS" | "JUGOS";

export type EstadoPedido =
  | "PENDIENTE"
  | "CONFIRMADO"
  | "EN_PREPARACION"
  | "LISTO"
  | "EN_TRANSITO"
  | "ENTREGADO"
  | "ENTREGADO_PARCIALMENTE"
  | "RETRASADO"
  | "CANCELADO";

export type TipoMovimiento =
  | "ENTRADA_PRODUCCION"
  | "SALIDA_PEDIDO"
  | "DEVOLUCION"
  | "DANADO"
  | "AJUSTE_POSITIVO"
  | "AJUSTE_NEGATIVO"
  | "REPOSICION"
  | "TRANSFERENCIA"
  | "RESERVA";

export interface UserSession {
  id: string;
  email: string;
  nombreCompleto: string;
  rol: RolUsuario;
}

export interface ProductStockInfo {
  id: string;
  sku: string;
  nombre: string;
  linea: string;
  sabor: string;
  presentacion: string;
  volumenLitros: number;
  botellasPorPaquete: number;
  precioPaquete: number;
  costoProduccionPaquete: number;
  stockMinimoPaquetes: number;
  stockMaximoPaquetes: number;
  activo: boolean;
  origenCosto: OrigenDato;
  // Calculados desde kardex
  stockActualPaquetes: number;
  stockActualBotellas: number;
  stockActualLitros: number;
  stockDisponiblePaquetes: number;
  stockComprometidoPaquetes: number;
  estadoStock: "NORMAL" | "MINIMO" | "CRITICO" | "SOBREINVENTARIO";
}

export interface ModelScenarioComparison {
  base: {
    id: string;
    nombre: string;
    valorObjetivo: number | null;
    variables: Record<string, number>;
  };
  modificado: {
    id: string;
    nombre: string;
    valorObjetivo: number | null;
    variables: Record<string, number>;
  };
  diferenciaObjetivo: number;
  porcentajeVariacion: number;
}
