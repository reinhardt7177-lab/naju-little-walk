import {destinations, type DestinationId} from './destinations.ts';
import type {GuideGesture} from './npc-animation.ts';

export type GuideReply = {text: string; gesture: GuideGesture};
/** Local scene guidance and gesture requests. No remote AI or microphone upload. */
export function guideReply(input: string, destinationId: DestinationId, name: string): GuideReply {
  const text = input.trim().slice(0, 240);
  if (/끄덕|동의|맞지|맞아/.test(text)) return {text: '네, 고개를 끄덕여볼게요.', gesture: 'Nod'};
  if (/안녕|인사|손.*흔|반가/.test(text)) return {text: `안녕하세요! 저는 ${name}예요. 함께 둘러볼까요?`, gesture: 'Greeting'};
  if (/가만|멈춰|쉬어|기본.*자세/.test(text)) return {text: '편하게 서서 기다릴게요.', gesture: 'Idle'};
  if (/들어.*줘|들어봐|경청/.test(text)) return {text: '네, 듣고 있어요.', gesture: 'Listen'};
  const place = destinations[destinationId];
  return {text: `${place.name}에 오신 걸 환영해요. ${place.introduction.join(' ')} 이동은 방향 버튼이나 W A S D, 시선은 화면을 드래그해서 바꿀 수 있어요.`, gesture: 'Explain'};
}
