import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "../lib/supabase";

const PROGRAMACAO_PDF = [
  { etapa: 3, data: "2026-07-07", turno: "MANHA", horario: "07:30", prova: "ABERTURA DA CAMARA DE CHAMADA-CONFIRMACAO", categoria: "", naipe: "", quantidade: "", fase: "" },
  { etapa: 3, data: "2026-07-07", turno: "MANHA", horario: "08:00", prova: "800m rasos", categoria: "12 a 14 anos", naipe: "Feminino", quantidade: "33", fase: "Semi-Final-8" },
  { etapa: 3, data: "2026-07-07", turno: "MANHA", horario: "08:10", prova: "Salto em Distancia", categoria: "12 a 14 anos", naipe: "Feminino", quantidade: "27", fase: "Final -8" },
  { etapa: 3, data: "2026-07-07", turno: "MANHA", horario: "08:10", prova: "Arremesso do Peso", categoria: "15 a 17 anos", naipe: "Feminino", quantidade: "25", fase: "Final -8" },
  { etapa: 3, data: "2026-07-07", turno: "MANHA", horario: "08:15", prova: "800m rasos", categoria: "12 a 14 anos", naipe: "Masculino", quantidade: "43", fase: "Semi-Final-8" },
  { etapa: 3, data: "2026-07-07", turno: "MANHA", horario: "08:30", prova: "800m rasos", categoria: "15 a 17 anos", naipe: "Feminino", quantidade: "40", fase: "Semi-Final-8" },
  { etapa: 3, data: "2026-07-07", turno: "MANHA", horario: "08:45", prova: "800m rasos", categoria: "15 a 17 anos", naipe: "Masculino", quantidade: "67", fase: "Semi-Final-8" },
  { etapa: 3, data: "2026-07-07", turno: "MANHA", horario: "09:00", prova: "80m rasos", categoria: "12 a 14 anos", naipe: "Feminino", quantidade: "63", fase: "Qualificacao-24" },
  { etapa: 3, data: "2026-07-07", turno: "MANHA", horario: "09:30", prova: "80m rasos", categoria: "12 a 14 anos", naipe: "Masculino", quantidade: "71", fase: "Qualificacao-24" },
  { etapa: 3, data: "2026-07-07", turno: "MANHA", horario: "09:40", prova: "Salto em Distancia", categoria: "12 a 14 anos", naipe: "Masculino", quantidade: "30", fase: "Final -8" },
  { etapa: 3, data: "2026-07-07", turno: "MANHA", horario: "09:40", prova: "Arremesso do Peso", categoria: "15 a 17 anos", naipe: "Masculino", quantidade: "41", fase: "Qual/Final - 8" },
  { etapa: 3, data: "2026-07-07", turno: "MANHA", horario: "09:45", prova: "100m rasos", categoria: "15 a 17 anos", naipe: "Feminino", quantidade: "65", fase: "Qualificacao-24" },
  { etapa: 3, data: "2026-07-07", turno: "MANHA", horario: "10:15", prova: "100m rasos", categoria: "15 a 17 anos", naipe: "Masculino", quantidade: "77", fase: "Qualificacao-24" },
  { etapa: 3, data: "2026-07-07", turno: "MANHA", horario: "10:45", prova: "80m Sobre Barreiras", categoria: "12 a 14 anos", naipe: "Feminino", quantidade: "8x(0,762m) 10", fase: "Final/Tp" },
  { etapa: 3, data: "2026-07-07", turno: "MANHA", horario: "10:55", prova: "100m Sobre Barreiras", categoria: "12 a 14 anos", naipe: "Masculino", quantidade: "10x(0,838m) 11", fase: "Final/Tp" },
  { etapa: 3, data: "2026-07-07", turno: "MANHA", horario: "11:00", prova: "100m Sobre Barreiras", categoria: "15 a 17 anos", naipe: "Feminino", quantidade: "10x(0,762m) 10", fase: "Final/Tp" },
  { etapa: 3, data: "2026-07-07", turno: "MANHA", horario: "11:10", prova: "110m Sobre Barreiras", categoria: "15 a 17 anos", naipe: "Masculino", quantidade: "10x(0,914m) 12", fase: "Final/Tp" },

  { etapa: 4, data: "2026-07-07", turno: "TARDE", horario: "14:00", prova: "ABERTURA DA CAMARA DE CHAMADA-CONFIRMACAO", categoria: "", naipe: "", quantidade: "", fase: "" },
  { etapa: 4, data: "2026-07-07", turno: "TARDE", horario: "15:00", prova: "150m rasos", categoria: "12 a 14 anos", naipe: "Feminino", quantidade: "69", fase: "Qualificacao-24" },
  { etapa: 4, data: "2026-07-07", turno: "TARDE", horario: "15:10", prova: "Salto em Distancia", categoria: "15 a 17 anos", naipe: "Feminino", quantidade: "29", fase: "Final -8" },
  { etapa: 4, data: "2026-07-07", turno: "TARDE", horario: "15:10", prova: "Arremesso do Peso", categoria: "12 a 14 anos", naipe: "Feminino", quantidade: "21", fase: "Final -8" },
  { etapa: 4, data: "2026-07-07", turno: "TARDE", horario: "15:30", prova: "150m rasos", categoria: "12 a 14 anos", naipe: "Masculino", quantidade: "64", fase: "Qualificacao-24" },
  { etapa: 4, data: "2026-07-07", turno: "TARDE", horario: "16:00", prova: "400m rasos", categoria: "15 a 17 anos", naipe: "Feminino", quantidade: "35", fase: "Semi-Final/Tp-8" },
  { etapa: 4, data: "2026-07-07", turno: "TARDE", horario: "16:20", prova: "400m rasos", categoria: "15 a 17 anos", naipe: "Masculino", quantidade: "74", fase: "Semi-Final/Tp-8" },
  { etapa: 4, data: "2026-07-07", turno: "TARDE", horario: "16:40", prova: "3000m Marcha Atletica", categoria: "12 a 14 anos", naipe: "Feminino", quantidade: "8", fase: "Final" },
  { etapa: 4, data: "2026-07-07", turno: "TARDE", horario: "16:40", prova: "Salto em Distancia", categoria: "15 a 17 anos", naipe: "Masculino", quantidade: "43", fase: "Final -8" },
  { etapa: 4, data: "2026-07-07", turno: "TARDE", horario: "16:40", prova: "Arremesso de Peso", categoria: "12 a 14 anos", naipe: "Masculino", quantidade: "23", fase: "Final -8" },
  { etapa: 4, data: "2026-07-07", turno: "TARDE", horario: "17:00", prova: "5000m Marcha Atletica", categoria: "12 a 14 anos", naipe: "Masculino", quantidade: "4", fase: "Final" },
  { etapa: 4, data: "2026-07-07", turno: "TARDE", horario: "17:40", prova: "Rev. 5x80m", categoria: "12 a 14 anos", naipe: "Feminino", quantidade: "?", fase: "Semi-Final-8" },
  { etapa: 4, data: "2026-07-07", turno: "TARDE", horario: "18:00", prova: "Rev. 5x80m", categoria: "12 a 14 anos", naipe: "Masculino", quantidade: "?", fase: "Semi-Final-8" },

  { etapa: 5, data: "2026-07-08", turno: "MANHA", horario: "07:30", prova: "ABERTURA DA CAMARA DE CHAMADA-CONFIRMACAO", categoria: "", naipe: "", quantidade: "", fase: "" },
  { etapa: 5, data: "2026-07-08", turno: "MANHA", horario: "08:00", prova: "Lancamento do Disco 750g", categoria: "12 a 14 anos", naipe: "Feminino", quantidade: "17", fase: "Final - 8" },
  { etapa: 5, data: "2026-07-08", turno: "MANHA", horario: "08:00", prova: "Salto em Altura", categoria: "12 a 14 anos", naipe: "Feminino", quantidade: "10", fase: "Final - 8" },
  { etapa: 5, data: "2026-07-08", turno: "MANHA", horario: "08:00", prova: "Salto em Altura", categoria: "12 a 14 anos", naipe: "Masculino", quantidade: "12", fase: "Final - 8" },
  { etapa: 5, data: "2026-07-08", turno: "MANHA", horario: "08:10", prova: "80m rasos", categoria: "12 a 14 anos", naipe: "Feminino", quantidade: "24", fase: "Semi-Final - 8" },
  { etapa: 5, data: "2026-07-08", turno: "MANHA", horario: "08:15", prova: "80m rasos", categoria: "12 a 14 anos", naipe: "Masculino", quantidade: "24", fase: "Semi-Final - 8" },
  { etapa: 5, data: "2026-07-08", turno: "MANHA", horario: "08:30", prova: "100m rasos", categoria: "15 a 17 anos", naipe: "Feminino", quantidade: "24", fase: "Semi-Final - 8" },
  { etapa: 5, data: "2026-07-08", turno: "MANHA", horario: "08:45", prova: "100m rasos", categoria: "15 a 17 anos", naipe: "Masculino", quantidade: "24", fase: "Semi-Final - 8" },
  { etapa: 5, data: "2026-07-08", turno: "MANHA", horario: "09:00", prova: "800m rasos", categoria: "12 a 14 anos", naipe: "Feminino", quantidade: "8", fase: "Final - 8" },
  { etapa: 5, data: "2026-07-08", turno: "MANHA", horario: "09:00", prova: "Lancamento do Disco 1kg", categoria: "12 a 14 anos", naipe: "Masculino", quantidade: "14", fase: "Final - 8" },
  { etapa: 5, data: "2026-07-08", turno: "MANHA", horario: "09:00", prova: "Salto em Altura", categoria: "15 a 17 anos", naipe: "Feminino", quantidade: "6", fase: "Final - 8" },
  { etapa: 5, data: "2026-07-08", turno: "MANHA", horario: "09:00", prova: "Salto em Altura", categoria: "15 a 17 anos", naipe: "Masculino", quantidade: "14", fase: "Final - 8" },
  { etapa: 5, data: "2026-07-08", turno: "MANHA", horario: "09:30", prova: "800m rasos", categoria: "12 a 14 anos", naipe: "Masculino", quantidade: "8", fase: "Final - 8" },
  { etapa: 5, data: "2026-07-08", turno: "MANHA", horario: "09:40", prova: "800m rasos", categoria: "15 a 17 anos", naipe: "Feminino", quantidade: "8", fase: "Final - 8" },
  { etapa: 5, data: "2026-07-08", turno: "MANHA", horario: "09:40", prova: "800m rasos", categoria: "15 a 17 anos", naipe: "Masculino", quantidade: "8", fase: "Final - 8" },
  { etapa: 5, data: "2026-07-08", turno: "MANHA", horario: "09:45", prova: "Lancamento do Disco 1kg", categoria: "15 a 17 anos", naipe: "Feminino", quantidade: "11", fase: "Final - 8" },
  { etapa: 5, data: "2026-07-08", turno: "MANHA", horario: "09:45", prova: "Lancamento do Disco 1,5kg", categoria: "15 a 17 anos", naipe: "Masculino", quantidade: "15", fase: "Final - 8" },
  { etapa: 5, data: "2026-07-08", turno: "MANHA", horario: "10:45", prova: "Rev. 4x100m", categoria: "15 a 17 anos", naipe: "Feminino", quantidade: "?", fase: "Semi-Final - 8" },
  { etapa: 5, data: "2026-07-08", turno: "MANHA", horario: "10:55", prova: "Rev. 4x100m", categoria: "15 a 17 anos", naipe: "Masculino", quantidade: "?", fase: "Semi-Final - 8" },

  { etapa: 6, data: "2026-07-08", turno: "TARDE", horario: "14:00", prova: "ABERTURA DA CAMARA DE CHAMADA-CONFIRMACAO", categoria: "", naipe: "", quantidade: "", fase: "" },
  { etapa: 6, data: "2026-07-08", turno: "TARDE", horario: "15:00", prova: "80m Sobre Barreiras", categoria: "12 a 14 anos", naipe: "Feminino", quantidade: "Pentatlo/5 0,762m", fase: "Final" },
  { etapa: 6, data: "2026-07-08", turno: "TARDE", horario: "15:10", prova: "100m Sobre Barreiras", categoria: "12 a 14 anos", naipe: "Masculino", quantidade: "Hexatlo/7 0,838m", fase: "Final" },
  { etapa: 6, data: "2026-07-08", turno: "TARDE", horario: "15:20", prova: "100m Sobre Barreiras", categoria: "15 a 17 anos", naipe: "Feminino", quantidade: "Pentatlo/7 0,762m", fase: "Final" },
  { etapa: 6, data: "2026-07-08", turno: "TARDE", horario: "15:30", prova: "110m Sobre Barreiras", categoria: "15 a 17 anos", naipe: "Masculino", quantidade: "Pentatlo/8 0,914m", fase: "Final" },
  { etapa: 6, data: "2026-07-08", turno: "TARDE", horario: "15:30", prova: "Salto em Altura", categoria: "12 a 14 anos", naipe: "Feminino", quantidade: "Pentatlo/5", fase: "Final" },
  { etapa: 6, data: "2026-07-08", turno: "TARDE", horario: "15:30", prova: "Salto em Distancia", categoria: "12 a 14 anos", naipe: "Masculino", quantidade: "Hexatlo/7", fase: "Final" },
  { etapa: 6, data: "2026-07-08", turno: "TARDE", horario: "15:40", prova: "Salto em Altura", categoria: "15 a 17 anos", naipe: "Feminino", quantidade: "Pentatlo/7", fase: "Final" },
  { etapa: 6, data: "2026-07-08", turno: "TARDE", horario: "15:40", prova: "Salto em Altura", categoria: "15 a 17 anos", naipe: "Masculino", quantidade: "Pentatlo/8", fase: "Final" },
  { etapa: 6, data: "2026-07-08", turno: "TARDE", horario: "16:00", prova: "Arremesso de Peso 4kg", categoria: "12 a 14 anos", naipe: "Masculino", quantidade: "Hexatlo/7", fase: "Final" },
  { etapa: 6, data: "2026-07-08", turno: "TARDE", horario: "16:00", prova: "3000m Marcha Atletica", categoria: "15 a 17 anos", naipe: "Feminino", quantidade: "6", fase: "Final" },
  { etapa: 6, data: "2026-07-08", turno: "TARDE", horario: "16:20", prova: "5000m Marcha Atletica", categoria: "15 a 17 anos", naipe: "Masculino", quantidade: "9", fase: "Final" },
  { etapa: 6, data: "2026-07-08", turno: "TARDE", horario: "17:00", prova: "80m Rasos", categoria: "12 a 14 anos", naipe: "Feminino", quantidade: "8", fase: "Final" },
  { etapa: 6, data: "2026-07-08", turno: "TARDE", horario: "17:10", prova: "80m Rasos", categoria: "12 a 14 anos", naipe: "Masculino", quantidade: "8", fase: "Final" },
  { etapa: 6, data: "2026-07-08", turno: "TARDE", horario: "17:20", prova: "100m Rasos", categoria: "15 a 17 anos", naipe: "Feminino", quantidade: "8", fase: "Final" },
  { etapa: 6, data: "2026-07-08", turno: "TARDE", horario: "17:30", prova: "100m Rasos", categoria: "15 a 17 anos", naipe: "Masculino", quantidade: "8", fase: "Final" },
  { etapa: 6, data: "2026-07-08", turno: "TARDE", horario: "17:40", prova: "3000m Rasos", categoria: "15 a 17 anos", naipe: "Feminino", quantidade: "21", fase: "Semi-Final-8" },
  { etapa: 6, data: "2026-07-08", turno: "TARDE", horario: "18:00", prova: "3000m Rasos", categoria: "15 a 17 anos", naipe: "Masculino", quantidade: "65", fase: "Semi-Final -8" },
  { etapa: 6, data: "2026-07-08", turno: "TARDE", horario: "18:20", prova: "Rev. 4x400m", categoria: "15 a 17 anos", naipe: "Misto", quantidade: "?", fase: "Semi-Final" },

  { etapa: 7, data: "2026-07-09", turno: "MANHA", horario: "07:30", prova: "ABERTURA DA CAMARA DE CHAMADA-CONFIRMACAO", categoria: "", naipe: "", quantidade: "", fase: "" },
  { etapa: 7, data: "2026-07-09", turno: "MANHA", horario: "08:00", prova: "Arremesso de Peso 3kg", categoria: "12 a 14 anos", naipe: "Feminino", quantidade: "Pentatlo/5", fase: "Final" },
  { etapa: 7, data: "2026-07-09", turno: "MANHA", horario: "08:00", prova: "Salto em Altura", categoria: "12 a 14 anos", naipe: "Masculino", quantidade: "Hexatlo/7", fase: "Final" },
  { etapa: 7, data: "2026-07-09", turno: "MANHA", horario: "08:00", prova: "2000m rasos", categoria: "12 a 14 anos", naipe: "Feminino", quantidade: "18", fase: "Semi-Final-8" },
  { etapa: 7, data: "2026-07-09", turno: "MANHA", horario: "08:20", prova: "2000m rasos", categoria: "12 a 14 anos", naipe: "Masculino", quantidade: "29", fase: "Semi-Final-8" },
  { etapa: 7, data: "2026-07-09", turno: "MANHA", horario: "08:40", prova: "400m rasos", categoria: "15 a 17 anos", naipe: "Feminino", quantidade: "8", fase: "Final" },
  { etapa: 7, data: "2026-07-09", turno: "MANHA", horario: "08:45", prova: "400m rasos", categoria: "15 a 17 anos", naipe: "Masculino", quantidade: "8", fase: "Final" },
  { etapa: 7, data: "2026-07-09", turno: "MANHA", horario: "09:00", prova: "Lancamento do Dardo 600g", categoria: "12 a 14 anos", naipe: "Masculino", quantidade: "Hexatlo/7", fase: "Final" },
  { etapa: 7, data: "2026-07-09", turno: "MANHA", horario: "09:00", prova: "Salto em Distancia", categoria: "12 a 14 anos", naipe: "Feminino", quantidade: "Pentatlo/5", fase: "Final" },
  { etapa: 7, data: "2026-07-09", turno: "MANHA", horario: "09:00", prova: "150m rasos", categoria: "12 a 14 anos", naipe: "Feminino", quantidade: "24", fase: "Semi-Final-8" },
  { etapa: 7, data: "2026-07-09", turno: "MANHA", horario: "09:10", prova: "150m rasos", categoria: "12 a 14 anos", naipe: "Masculino", quantidade: "24", fase: "Semi-Final-8" },
  { etapa: 7, data: "2026-07-09", turno: "MANHA", horario: "09:20", prova: "200m rasos", categoria: "15 a 17 anos", naipe: "Feminino", quantidade: "24", fase: "Semi-Final-8" },
  { etapa: 7, data: "2026-07-09", turno: "MANHA", horario: "09:30", prova: "200m rasos", categoria: "15 a 17 anos", naipe: "Masculino", quantidade: "24", fase: "Semi-Final-8" },
  { etapa: 7, data: "2026-07-09", turno: "MANHA", horario: "09:40", prova: "600m Rasos", categoria: "12 a 14 anos", naipe: "Feminino", quantidade: "Pentatlo/5", fase: "Final" },
  { etapa: 7, data: "2026-07-09", turno: "MANHA", horario: "09:50", prova: "800m Rasos", categoria: "12 a 14 anos", naipe: "Masculino", quantidade: "Hexatlo/7", fase: "Final" },
  { etapa: 7, data: "2026-07-09", turno: "MANHA", horario: "10:00", prova: "Salto Triplo - 7m", categoria: "15 a 17 anos", naipe: "Feminino", quantidade: "4", fase: "Final-8" },
  { etapa: 7, data: "2026-07-09", turno: "MANHA", horario: "10:00", prova: "Salto Triplo - 9m", categoria: "15 a 17 anos", naipe: "Masculino", quantidade: "9", fase: "Final-8" },
  { etapa: 7, data: "2026-07-09", turno: "MANHA", horario: "10:00", prova: "Lancamento do Dardo 500g", categoria: "12 a 14 anos", naipe: "Feminino", quantidade: "17", fase: "Final-8" },
  { etapa: 7, data: "2026-07-09", turno: "MANHA", horario: "10:00", prova: "Lancamento do Dardo 600g", categoria: "12 a 14 anos", naipe: "Masculino", quantidade: "18", fase: "Final-8" },

  { etapa: 8, data: "2026-07-09", turno: "TARDE", horario: "14:00", prova: "ABERTURA DA CAMARA DE CHAMADA-CONFIRMACAO", categoria: "", naipe: "", quantidade: "", fase: "" },
  { etapa: 8, data: "2026-07-09", turno: "TARDE", horario: "15:00", prova: "Arremesso de Peso 3kg", categoria: "15 a 17 anos", naipe: "Feminino", quantidade: "Pentatlo-7", fase: "Final" },
  { etapa: 8, data: "2026-07-09", turno: "TARDE", horario: "15:10", prova: "Arremesso de Peso 5kg", categoria: "15 a 17 anos", naipe: "Masculino", quantidade: "Pentatlo-8", fase: "Final" },
  { etapa: 8, data: "2026-07-09", turno: "TARDE", horario: "15:20", prova: "150m rasos", categoria: "12 a 14 anos", naipe: "Feminino", quantidade: "8", fase: "Final" },
  { etapa: 8, data: "2026-07-09", turno: "TARDE", horario: "15:30", prova: "150m rasos", categoria: "12 a 14 anos", naipe: "Masculino", quantidade: "8", fase: "Final" },
  { etapa: 8, data: "2026-07-09", turno: "TARDE", horario: "15:30", prova: "200m rasos", categoria: "15 a 17 anos", naipe: "Feminino", quantidade: "8", fase: "Final" },
  { etapa: 8, data: "2026-07-09", turno: "TARDE", horario: "15:30", prova: "200m rasos", categoria: "15 a 17 anos", naipe: "Masculino", quantidade: "8", fase: "Final" },
  { etapa: 8, data: "2026-07-09", turno: "TARDE", horario: "15:40", prova: "Salto em Distancia", categoria: "15 a 17 anos", naipe: "Feminino", quantidade: "Pentatlo-7", fase: "Final" },
  { etapa: 8, data: "2026-07-09", turno: "TARDE", horario: "15:40", prova: "Salto em Distancia", categoria: "15 a 17 anos", naipe: "Masculino", quantidade: "Pentatlo-8", fase: "Final" },
  { etapa: 8, data: "2026-07-09", turno: "TARDE", horario: "16:00", prova: "Rev. 4x100m", categoria: "15 a 17 anos", naipe: "Feminino", quantidade: "8", fase: "Final" },
  { etapa: 8, data: "2026-07-09", turno: "TARDE", horario: "16:00", prova: "Rev. 4x100m", categoria: "15 a 17 anos", naipe: "Masculino", quantidade: "8", fase: "Final" },
  { etapa: 8, data: "2026-07-09", turno: "TARDE", horario: "16:20", prova: "800m Rasos", categoria: "15 a 17 anos", naipe: "Feminino", quantidade: "Pentatlo-7", fase: "Final" },
  { etapa: 8, data: "2026-07-09", turno: "TARDE", horario: "17:00", prova: "800m Rasos", categoria: "15 a 17 anos", naipe: "Masculino", quantidade: "Pentatlo-8", fase: "Final" },

  { etapa: 9, data: "2026-07-10", turno: "MANHA", horario: "07:30", prova: "ABERTURA DA CAMARA DE CHAMADA-CONFIRMACAO", categoria: "", naipe: "", quantidade: "", fase: "" },
  { etapa: 9, data: "2026-07-10", turno: "MANHA", horario: "08:00", prova: "3000m Rasos", categoria: "15 a 17 anos", naipe: "Feminino", quantidade: "8", fase: "Final- 8" },
  { etapa: 9, data: "2026-07-10", turno: "MANHA", horario: "08:00", prova: "Lancamento do Dardo 600g", categoria: "15 a 17 anos", naipe: "Feminino", quantidade: "13", fase: "Final- 8" },
  { etapa: 9, data: "2026-07-10", turno: "MANHA", horario: "08:00", prova: "Lancamento do Dardo 700g", categoria: "15 a 17 anos", naipe: "Masculino", quantidade: "31", fase: "Final- 8" },
  { etapa: 9, data: "2026-07-10", turno: "MANHA", horario: "08:20", prova: "3000m Rasos", categoria: "15 a 17 anos", naipe: "Masculino", quantidade: "8", fase: "Final- 8" },
  { etapa: 9, data: "2026-07-10", turno: "MANHA", horario: "08:40", prova: "2000m Rasos", categoria: "12 a 14 anos", naipe: "Feminino", quantidade: "8", fase: "Final" },
  { etapa: 9, data: "2026-07-10", turno: "MANHA", horario: "09:00", prova: "2000m Rasos", categoria: "12 a 14 anos", naipe: "Masculino", quantidade: "8", fase: "Final" },
  { etapa: 9, data: "2026-07-10", turno: "MANHA", horario: "09:20", prova: "Rev. 5x80m", categoria: "12 a 14 anos", naipe: "Feminino", quantidade: "8", fase: "Final" },
  { etapa: 9, data: "2026-07-10", turno: "MANHA", horario: "09:30", prova: "Rev. 5x80m", categoria: "12 a 14 anos", naipe: "Masculino", quantidade: "8", fase: "Final" },
  { etapa: 9, data: "2026-07-10", turno: "MANHA", horario: "09:40", prova: "Rev. 4x400m", categoria: "15 a 17 anos", naipe: "Misto", quantidade: "8", fase: "Final" },
];

const inputStyle = {
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  color: "#0f172a",
  fontWeight: 700,
  padding: "10px 12px",
  width: "100%",
};

const buttonStyle = {
  border: "none",
  borderRadius: 10,
  color: "#020617",
  cursor: "pointer",
  fontWeight: 900,
  padding: "11px 16px",
};

function normalizar(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[ºª]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

function chaveProgramacao(item, index) {
  return [
    item.etapa,
    item.data,
    item.turno,
    item.horario,
    item.prova,
    item.categoria,
    item.naipe,
    item.fase,
    index + 1,
  ]
    .map((parte) => normalizar(parte))
    .join("|");
}

function provaPadrao(item) {
  const texto = normalizar(`${item.prova || item.prova_texto} ${item.quantidade} ${item.fase || item.fase_programada}`);

  if (texto.includes("ABERTURA")) return "";
  if (texto.includes("HEXATLO")) return "COMBINADAS HEXATLO";
  if (texto.includes("PENTATLO")) return "COMBINADAS PENTATLO";
  if (texto.includes("REV") && texto.includes("5X80")) return "REVEZAMENTO 5X80M";
  if (texto.includes("REV") && texto.includes("4X100")) return "REVEZAMENTO 4X100M";
  if (texto.includes("REV") && texto.includes("4X400")) return "REVEZAMENTO 4X400M MISTO";
  if (texto.includes("110M") && texto.includes("BARREIRAS")) return "110 METROS COM BARREIRAS";
  if (texto.includes("100M") && texto.includes("BARREIRAS")) return "100 METROS COM BARREIRAS";
  if (texto.includes("80M") && texto.includes("BARREIRAS")) return "80 METROS COM BARREIRAS";
  if (texto.includes("SALTO") && texto.includes("ALTURA")) return "SALTO EM ALTURA";
  if (texto.includes("SALTO") && texto.includes("DISTANCIA")) return "SALTO EM DISTANCIA";
  if (texto.includes("SALTO") && texto.includes("TRIPLO")) return "SALTO TRIPLO";
  if (texto.includes("ARREMESSO") || texto.includes("PESO")) return "ARREMESSO DO PESO";
  if (texto.includes("DARDO")) return "LANCAMENTO DO DARDO";
  if (texto.includes("DISCO")) return "LANCAMENTO DO DISCO";
  if (texto.includes("MARTELO")) return "LANCAMENTO DO MARTELO";
  if (texto.includes("MARCHA")) return "MARCHA ATLETICA";
  if (texto.includes("3000M")) return "3000 METROS";
  if (texto.includes("2000M")) return "2000 METROS";
  if (texto.includes("800M")) return "800 METROS";
  if (texto.includes("600M")) return "COMBINADAS PENTATLO";
  if (texto.includes("400M")) return "400 METROS";
  if (texto.includes("200M")) return "200 METROS";
  if (texto.includes("150M")) return "150 METROS";
  if (texto.includes("100M")) return "100 METROS";
  if (texto.includes("80M")) return "80 METROS";
  return item.prova || item.prova_texto || "";
}

function faseProgramadaTipo(item) {
  const fase = normalizar(item.fase || item.fase_programada);

  if (fase.includes("SEMI")) return "SEMI";
  if (fase.includes("QUAL")) return "QUALIFICACAO";
  if (fase.includes("FINAL")) return "FINAL";
  return "";
}

function mesmaProvaProgramada(a, b) {
  return (
    normalizar(provaPadrao(a)) === normalizar(provaPadrao(b)) &&
    normalizar(a.categoria) === normalizar(b.categoria) &&
    normalizar(a.naipe) === normalizar(b.naipe)
  );
}

function itemCalendarioBase(item) {
  if (PROGRAMACAO_PDF.includes(item)) return item;

  return PROGRAMACAO_PDF.find((base, index) => chaveProgramacao(base, index) === item.chave) || item;
}

function existeFaseAnteriorProgramada(item) {
  const itemBase = itemCalendarioBase(item);
  const indiceAtual = PROGRAMACAO_PDF.indexOf(itemBase);
  if (indiceAtual < 0) return false;

  return PROGRAMACAO_PDF.some((outro, indice) => {
    if (indice >= indiceAtual || !mesmaProvaProgramada(outro, itemBase)) return false;
    const fase = faseProgramadaTipo(outro);
    return fase === "QUALIFICACAO" || fase === "SEMI";
  });
}

function faseOficialCompativel(prova, item) {
  const faseDesejada = faseProgramadaTipo(item);
  const faseOficial = normalizar(prova?.fase || "QUALIFICACAO");

  if (!faseDesejada) return true;
  if (faseDesejada === "QUALIFICACAO") return faseOficial.includes("QUAL");
  if (faseDesejada === "SEMI") return faseOficial.includes("SEMI");
  if (faseDesejada === "FINAL") return faseOficial.includes("FINAL");
  return true;
}

function podeUsarProvaBase(prova, item) {
  const faseDesejada = faseProgramadaTipo(item);
  const tipo = normalizar(prova?.tipo);

  if (!faseDesejada || faseDesejada === "QUALIFICACAO") return true;
  if (tipo === "CAMPO" || tipo === "COMBINADA") return true;

  // Se a pista ainda tera semifinal/final criada pela classificacao,
  // nao amarra a etapa futura na prova base de qualificacao.
  return !existeFaseAnteriorProgramada(item);
}

function encontrarProva(provas, item) {
  const alvo = normalizar(provaPadrao(item));
  if (!alvo) return null;

  const categoria = normalizar(item.categoria);
  const naipe = normalizar(item.naipe);
  const candidatas = (provas || []).filter((prova) => {
    return (
      normalizar(prova.nome) === alvo &&
      (!categoria || normalizar(prova.categoria) === categoria) &&
      (!naipe || normalizar(prova.naipe) === naipe)
    );
  });

  const provaMesmaFase = candidatas.find((prova) => faseOficialCompativel(prova, item));
  if (provaMesmaFase) return provaMesmaFase.id;

  const provaBasePermitida = candidatas.find((prova) => podeUsarProvaBase(prova, item));
  return provaBasePermitida?.id || null;
}

function situacaoVinculo(item) {
  if (normalizar(item.prova_texto || item.prova).includes("ABERTURA")) {
    return { texto: "Sem prova", cor: "#64748b", fundo: "#f1f5f9" };
  }

  if (item.prova_id) {
    return { texto: "Vinculada", cor: "#166534", fundo: "#dcfce7" };
  }

  const fase = faseProgramadaTipo(item);
  if ((fase === "SEMI" || fase === "FINAL") && existeFaseAnteriorProgramada(item)) {
    return { texto: "Aguardando fase", cor: "#9a3412", fundo: "#ffedd5" };
  }

  return { texto: "Sem vinculo", cor: "#991b1b", fundo: "#fee2e2" };
}

function tabelaInexistente(error) {
  const texto = `${error?.message || ""} ${error?.details || ""} ${error?.hint || ""}`.toLowerCase();
  return error?.code === "PGRST205" || texto.includes("programacao_atletismo");
}

function dataBR(data) {
  if (!data) return "";
  const [ano, mes, dia] = String(data).split("-");
  return dia && mes && ano ? `${dia}/${mes}/${ano}` : data;
}

export default function Programacao() {
  const [itens, setItens] = useState([]);
  const [provas, setProvas] = useState([]);
  const [mensagem, setMensagem] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [erroTabela, setErroTabela] = useState(false);
  const [busca, setBusca] = useState("");
  const [etapaFiltro, setEtapaFiltro] = useState("");
  const [turnoFiltro, setTurnoFiltro] = useState("");

  async function carregarTudo() {
    setCarregando(true);
    setErroTabela(false);

    const [programacaoResp, provasResp] = await Promise.all([
      supabase
        .from("programacao_atletismo")
        .select("*, provas(id,nome,categoria,naipe,fase,tipo)")
        .order("data", { ascending: true })
        .order("etapa_numero", { ascending: true })
        .order("horario", { ascending: true })
        .order("ordem", { ascending: true }),
      supabase
        .from("provas")
        .select("id,nome,categoria,naipe,fase,tipo")
        .order("nome", { ascending: true }),
    ]);

    if (programacaoResp.error) {
      if (tabelaInexistente(programacaoResp.error)) {
        setErroTabela(true);
        setMensagem("Tabela de programacao ainda nao existe. Rode a migration no Supabase.");
      } else {
        setMensagem("Erro ao carregar programacao: " + programacaoResp.error.message);
      }
      setItens([]);
    } else {
      setItens(programacaoResp.data || []);
    }

    if (provasResp.error) {
      setMensagem("Erro ao carregar provas oficiais: " + provasResp.error.message);
    } else {
      setProvas(provasResp.data || []);
    }

    setCarregando(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void carregarTudo();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const provasOptions = useMemo(
    () =>
      [...provas].sort((a, b) =>
        `${a.nome} ${a.categoria} ${a.naipe}`.localeCompare(`${b.nome} ${b.categoria} ${b.naipe}`)
      ),
    [provas]
  );

  const etapas = useMemo(() => [...new Set(itens.map((item) => item.etapa_numero))].sort((a, b) => a - b), [itens]);

  const itensFiltrados = useMemo(() => {
    const termo = normalizar(busca);

    return itens.filter((item) => {
      const texto = normalizar(`${item.horario} ${item.prova_texto} ${item.categoria} ${item.naipe} ${item.fase_programada} ${item.provas?.nome || ""}`);
      return (
        (!etapaFiltro || String(item.etapa_numero) === String(etapaFiltro)) &&
        (!turnoFiltro || item.turno === turnoFiltro) &&
        (!termo || texto.includes(termo))
      );
    });
  }, [busca, etapaFiltro, turnoFiltro, itens]);

  const resumo = useMemo(() => {
    const provasAgendadas = itens.filter((item) => !normalizar(item.prova_texto).includes("ABERTURA"));
    return {
      total: itens.length,
      provas: provasAgendadas.length,
      vinculadas: provasAgendadas.filter((item) => item.prova_id).length,
      semVinculo: provasAgendadas.filter((item) => !item.prova_id).length,
      aguardandoFase: provasAgendadas.filter((item) => situacaoVinculo(item).texto === "Aguardando fase").length,
    };
  }, [itens]);

  async function carregarProgramacaoDoPdf() {
    if (!provas.length) {
      setMensagem("As provas oficiais ainda nao carregaram. Aguarde e tente novamente.");
      return;
    }

    const payload = PROGRAMACAO_PDF.map((item, index) => ({
      chave: chaveProgramacao(item, index),
      etapa_numero: item.etapa,
      data: item.data,
      turno: item.turno,
      horario: item.horario,
      prova_texto: item.prova,
      categoria: item.categoria || null,
      naipe: item.naipe || null,
      quantidade: item.quantidade || null,
      fase_programada: item.fase || null,
      observacao: null,
      prova_id: encontrarProva(provas, item),
      ordem: index + 1,
      atualizada_em: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from("programacao_atletismo")
      .upsert(payload, { onConflict: "chave" });

    if (error) {
      setMensagem("Erro ao carregar programacao do PDF: " + error.message);
      return;
    }

    setMensagem("Programacao do PDF carregada no banco. Os dados oficiais de atletas/provas/resultados nao foram alterados.");
    await carregarTudo();
  }

  async function vincularProva(itemId, provaId) {
    const { error } = await supabase
      .from("programacao_atletismo")
      .update({ prova_id: provaId || null, atualizada_em: new Date().toISOString() })
      .eq("id", itemId);

    if (error) {
      setMensagem("Erro ao vincular prova: " + error.message);
      return;
    }

    setItens((atuais) =>
      atuais.map((item) =>
        item.id === itemId
          ? {
              ...item,
              prova_id: provaId || null,
              provas: provas.find((prova) => String(prova.id) === String(provaId)) || null,
            }
          : item
      )
    );
  }

  async function excluirItem(itemId) {
    if (!window.confirm("Excluir este item somente da programacao? As provas oficiais nao serao alteradas.")) return;

    const { error } = await supabase.from("programacao_atletismo").delete().eq("id", itemId);
    if (error) {
      setMensagem("Erro ao excluir item: " + error.message);
      return;
    }

    setItens((atuais) => atuais.filter((item) => item.id !== itemId));
  }

  function exportarExcel() {
    const linhas = itensFiltrados.map((item) => ({
      Etapa: item.etapa_numero,
      Data: dataBR(item.data),
      Turno: item.turno,
      Horario: item.horario,
      Prova: item.prova_texto,
      Categoria: item.categoria || "",
      Naipe: item.naipe || "",
      Quantidade: item.quantidade || "",
      Fase: item.fase_programada || "",
      Situacao: situacaoVinculo(item).texto,
      "Prova vinculada": item.provas?.nome || "",
      "Categoria vinculada": item.provas?.categoria || "",
      "Naipe vinculado": item.provas?.naipe || "",
      "Fase vinculada": item.provas?.fase || "",
    }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(linhas), "Programacao");
    XLSX.writeFile(workbook, `programacao-atletismo-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  function imprimirProgramacao() {
    window.print();
  }

  return (
    <div>
      <style>{`
        @media print {
          .nao-imprimir, .sidebar, .topbar { display: none !important; }
          .app, .main, .content { display: block !important; width: 100% !important; margin: 0 !important; padding: 0 !important; }
          .programacao-print-card { box-shadow: none !important; border: none !important; }
          .programacao-tabela th, .programacao-tabela td { border: 1px solid #111827 !important; color: #000 !important; font-size: 9px !important; padding: 5px !important; }
          .programacao-tabela th { background: #e8eef4 !important; }
        }
      `}</style>

      <div className="nao-imprimir">
        <h1>Programacao</h1>
        <p className="muted">Organize as etapas, horarios e provas do atletismo sem alterar os dados oficiais.</p>

        {erroTabela && (
          <div className="card" style={{ marginBottom: 20, border: "1px solid #f97316", background: "#fff7ed" }}>
            <strong>Falta criar a tabela no Supabase.</strong>
            <p style={{ marginTop: 8 }}>
              Rode o arquivo <code>supabase/migrations/20260705_programacao_atletismo.sql</code> no SQL Editor.
            </p>
          </div>
        )}

        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <button onClick={carregarProgramacaoDoPdf} disabled={erroTabela || carregando} style={{ ...buttonStyle, background: "#22c55e" }}>
              Carregar programacao do PDF
            </button>
            <button onClick={imprimirProgramacao} style={{ ...buttonStyle, background: "#38bdf8" }}>
              Imprimir programacao
            </button>
            <button onClick={exportarExcel} style={{ ...buttonStyle, background: "#2563eb", color: "#ffffff" }}>
              Exportar Excel
            </button>
          </div>

          <p style={{ color: "#64748b", fontWeight: 700, marginTop: 12 }}>
            O botao do PDF cria/atualiza somente a programacao. Ele nao apaga atleta, inscricao, prova, serie ou resultado.
          </p>
        </div>

        <div className="card" style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 12, marginBottom: 20 }}>
          <div><strong>Total</strong><br />{resumo.total} item(ns)</div>
          <div><strong>Provas</strong><br />{resumo.provas}</div>
          <div><strong>Vinculadas</strong><br />{resumo.vinculadas}</div>
          <div><strong>Sem vinculo</strong><br />{resumo.semVinculo}</div>
          <div><strong>Aguardando fase</strong><br />{resumo.aguardandoFase}</div>
        </div>

        <div className="card" style={{ marginBottom: 20, display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12 }}>
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por prova, fase, categoria..." style={inputStyle} />

          <select value={etapaFiltro} onChange={(e) => setEtapaFiltro(e.target.value)} style={inputStyle}>
            <option value="">Todas as etapas</option>
            {etapas.map((etapa) => (
              <option key={etapa} value={etapa}>{etapa} etapa</option>
            ))}
          </select>

          <select value={turnoFiltro} onChange={(e) => setTurnoFiltro(e.target.value)} style={inputStyle}>
            <option value="">Todos os turnos</option>
            <option value="MANHA">Manha</option>
            <option value="TARDE">Tarde</option>
          </select>
        </div>
      </div>

      <div className="card programacao-print-card">
        <h2 style={{ color: "#003b70", marginTop: 0, textAlign: "center" }}>PROGRAMACAO OFICIAL DO ATLETISMO - JER 2026</h2>

        {mensagem && (
          <div className="nao-imprimir" style={{ margin: "10px 0", color: "#0f172a", fontWeight: 800 }}>
            {mensagem}
          </div>
        )}

        {carregando ? (
          <p>Carregando programacao...</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="programacao-tabela" width="100%" cellPadding="10" style={{ borderCollapse: "collapse", minWidth: 1260 }}>
              <thead>
                <tr style={{ background: "#e8eef4" }}>
                  <th>Etapa</th>
                  <th>Data</th>
                  <th>Turno</th>
                  <th>Horario</th>
                  <th>Prova</th>
                  <th>Categoria</th>
                  <th>Naipe</th>
                  <th>Qtd</th>
                  <th>Fase</th>
                  <th className="nao-imprimir">Situacao</th>
                  <th className="nao-imprimir">Vinculo oficial</th>
                  <th className="nao-imprimir">Acao</th>
                </tr>
              </thead>

              <tbody>
                {itensFiltrados.map((item) => {
                  const situacao = situacaoVinculo(item);

                  return (
                    <tr key={item.id}>
                      <td align="center">{item.etapa_numero}</td>
                      <td>{dataBR(item.data)}</td>
                      <td>{item.turno}</td>
                      <td><strong>{item.horario}</strong></td>
                      <td><strong>{item.prova_texto}</strong></td>
                      <td>{item.categoria || "-"}</td>
                      <td>{item.naipe || "-"}</td>
                      <td align="center">{item.quantidade || "-"}</td>
                      <td>{item.fase_programada || "-"}</td>
                      <td className="nao-imprimir">
                        <span
                          style={{
                            background: situacao.fundo,
                            borderRadius: 999,
                            color: situacao.cor,
                            display: "inline-block",
                            fontWeight: 900,
                            padding: "6px 10px",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {situacao.texto}
                        </span>
                      </td>
                      <td className="nao-imprimir">
                        {normalizar(item.prova_texto).includes("ABERTURA") ? (
                          <span>Sem prova</span>
                        ) : (
                          <select value={item.prova_id || ""} onChange={(e) => void vincularProva(item.id, e.target.value)} style={inputStyle}>
                            <option value="">Sem vinculo</option>
                            {provasOptions.map((prova) => (
                              <option key={prova.id} value={prova.id}>
                                {prova.nome} - {prova.categoria} - {prova.naipe} - {prova.fase || "QUALIFICACAO"}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="nao-imprimir">
                        <button onClick={() => void excluirItem(item.id)} style={{ ...buttonStyle, background: "#ef4444", color: "#ffffff", padding: "8px 10px" }}>
                          Excluir
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {!itensFiltrados.length && (
                  <tr>
                    <td colSpan="12" align="center">Nenhum item encontrado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
