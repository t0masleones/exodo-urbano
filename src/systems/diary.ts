import { HUMANS, PETS } from '../data/characters';
import type { GameState } from '../state/types';
import { pick } from '../util/random';
import type { DayReport } from './farm';
import { dayInSeason, seasonLabel, seasonOf } from './time';

const REFLEXOES = [
  'Nenhuma reunião, nenhum e-mail. Só a seriema gritando lá longe.',
  'Acordamos sem despertador de novo. Ainda é estranho, no bom sentido.',
  'O café coado no fogão a lenha tem outro gosto. Juro.',
  'Lembrei do trânsito da cidade e dei risada olhando pro cerrado.',
  'A Chihiro roncou a noite toda. O Kuririn respondeu. Dueto.',
  'O pôr do sol aqui pinta tudo de laranja. Nenhum PowerPoint chega perto.',
  'Às vezes a gente só senta na varanda e não faz nada. E tá tudo bem.',
  'Mãos sujas de terra vermelha. Melhor que crachá.',
];
const CHUVAS = ['Cheiro de terra molhada. O cerrado ficou verde de um dia pro outro.', 'O barulho da chuva no telhado embala qualquer um.'];
const SECA = ['O céu da seca é enorme. Os ipês estão começando a florir.', 'Poeira vermelha no fim da tarde e um céu de cartão-postal.'];

export interface DiaryEntry { title: string; author: string; lines: string[] }

export function buildDiary(state: GameState, report: DayReport): DiaryEntry {
  const season = seasonOf(state.day);
  const author = HUMANS[state.active].name;
  const lines: string[] = [pick(Math.random() < 0.4 ? (season === 'chuvas' ? CHUVAS : SECA) : REFLEXOES)];

  const p = report.prev;
  const feitos: string[] = [];
  if (p.colheitas) feitos.push(`colhemos ${p.colheitas} coisas da horta`);
  if (p.plantios) feitos.push(`plantamos ${p.plantios} mudas`);
  if (p.madeira) feitos.push(`juntamos ${p.madeira} de madeira`);
  if (p.pedras) feitos.push(`tiramos ${p.pedras} de pedra e argila do caminho`);
  if (feitos.length) lines.push(`Ontem ${feitos.join(', ')}.`);
  if (p.carinhos.length) lines.push(`Teve carinho pra ${p.carinhos.map((id) => PETS[id].name).join(', ')}.`);

  lines.push(...report.events);
  lines.push(state.weather === 'chuva' ? 'Hoje: chuva 🌧️, a horta se rega sozinha.' : 'Hoje: sol ☀️. Não esquecer o regador.');

  return { title: `Dia ${state.day} · ${seasonLabel(season)} (${dayInSeason(state.day)}º dia)`, author, lines };
}
