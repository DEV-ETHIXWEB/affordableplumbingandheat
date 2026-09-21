import { describe, expect, it } from 'vitest';
import { createAssistant, greeting, initialState, markLeadSent, respond, type ConversationState } from './brain';
import { extractCity, extractEntities, extractName, extractPhone, extractService } from './entities';
import { normalize } from './text';
import { loadKnowledgeForTests } from './testKnowledge';
import type { BotReply } from './types';

const knowledge = loadKnowledgeForTests();
const assistant = createAssistant(knowledge);
const env = { now: new Date('2026-09-16T15:00:00Z') }; // 9am in Colorado, coupons active

function talk(lines: string[], page?: string) {
  let state: ConversationState = initialState(page);
  const replies: BotReply[] = [];
  for (const line of lines) {
    const turn = respond(state, line, assistant, env);
    state = turn.state;
    replies.push(turn.reply);
  }
  return { state, replies, last: replies.at(-1)!, text: replies.at(-1)!.text };
}
const ask = (line: string, page?: string) => talk([line], page).text;
const service = (text: string) => extractService(normalize(text), knowledge)?.slug;

describe('language understanding', () => {
  it.each([
    ['my water heater is leaking', 'water-heater-repair-colorado-springs'],
    ['no hot water this morning', 'water-heater-repair-colorado-springs'],
    ['I want a new water heater installed', 'water-heater-replacement-colorado-springs'],
    ['thinking about going tankless', 'tankless-water-heater-installation-colorado-springs'],
    ['kitchen sink is clogged', 'drain-cleaning-colorado-springs'],
    ['toilet keeps running', 'toilet-repair-colorado-springs'],
    ["my furnce won't turn on", 'furnace-repair-colorado-springs'],
    ['furnace tune up before winter', 'furnace-tune-up-colorado-springs'],
    ['the ac is blowing warm air', 'ac-repair-colorado-springs'],
    ['quote for a new air conditioner', 'ac-replacement-colorado-springs'],
    ['breaker keeps tripping', 'electrician-colorado-springs'],
    ['we need a panel upgrade to 200 amp', 'electrical-panel-upgrade-colorado-springs'],
    ['do you install EV chargers', 'electric-vehicle-charger-colorado-springs'],
    ['standby generator for power outages', 'back-up-generator-installation-colorado-springs'],
    ['sewage smell in the basement', 'sewer-repair-colorado-springs'],
    ['hard water spots everywhere', 'water-softener-installation-colorado-springs'],
    ['low water pressure in the whole house', 'water-line-repair-colorado-springs'],
    ['mini split not working', 'mini-split-repair-colorado-springs'],
    ['sump pump failed', 'sump-pump-repair-colorado-springs'],
    ['install ceiling fans', 'ceiling-fan-installation-colorado-springs'],
    ['heat pump making noise', 'heat-pump-repair-colorado-springs'],
    ['boiler is leaking', 'boiler-repair-colorado-springs']
  ])('"%s" -> %s', (text, slug) => {
    expect(service(text)).toBe(slug);
  });

  it('does not mistake everyday words for trades (sure != surge)', () => {
    expect(service('ok sure')).toBeUndefined();
    expect(service('I will wait')).toBeUndefined();
  });

  it.each([
    ['(719) 555-0100', '(719) 555-0100'],
    ['call 719.555.0100 please', '719.555.0100'],
    ['my number is +1 719 555 0100 ext 22', '+1 719 555 0100 ext 22'],
    ['7195550100', '7195550100']
  ])('phone in "%s"', (text, phone) => {
    expect(extractPhone(text).phone).toBe(phone);
  });

  it('flags an incomplete phone number instead of accepting it', () => {
    expect(extractPhone('555-0100').phone).toBeUndefined();
    expect(extractPhone('555-0100').invalidPhone).toBeTruthy();
    expect(extractPhone('my zip is 80917').invalidPhone).toBeUndefined();
  });

  it.each([
    ["Hi, I'm Jordan Lee", false, 'Jordan Lee'],
    ['my name is sam carter', false, 'Sam Carter'],
    ['this is Dana', false, 'Dana'],
    ["I'm in Fountain", false, undefined],
    ["I'm having an issue with my furnace", false, undefined],
    ["I'm looking for a quote", false, undefined],
    ['jordan', true, 'Jordan'],
    ['yes', true, undefined],
    ["it's leaking", true, undefined]
  ])('name in "%s" (expecting=%s)', (text, expecting, name) => {
    expect(extractName(text, expecting)).toBe(name);
  });

  it.each([
    ['we are in monument', 'area', 'Monument'],
    ['manitou springs', 'area', 'Manitou Springs'],
    ['over in briargate', 'area', 'Colorado Springs'],
    ['castle rok', 'area', 'Castle Rock'],
    ['pueblo west', 'nearby', 'Pueblo West'],
    ['80817', 'zip', 'Fountain'],
    ['80920', 'zip', 'Colorado Springs']
  ])('city in "%s"', (text, kind, name) => {
    const city = extractCity(normalize(text), knowledge);
    expect(city?.kind).toBe(kind);
    expect(city && 'name' in city ? city.name : undefined).toBe(name);
  });

  it('reads urgency and property type from normal wording', () => {
    const urgent = extractEntities(
      'need help asap at my house',
      normalize('need help asap at my house'),
      knowledge,
      null
    );
    expect(urgent.urgent).toBe(true);
    expect(urgent.propertyType).toBe('Residential');
    const calm = extractEntities(
      'no rush, it is for our office',
      normalize('no rush, it is for our office'),
      knowledge,
      null
    );
    expect(calm.urgent).toBe(false);
    expect(calm.propertyType).toBe('Commercial');
  });
});

describe('small talk feels human', () => {
  it('greets back and invites the problem', () => {
    expect(ask('hi')).toMatch(/hey|hi|hello/i);
  });
  it('answers how are you', () => {
    expect(ask('how are you doing?')).toMatch(/doing|great|well|complain/i);
  });
  it('is honest about being a virtual assistant', () => {
    const text = ask('am I talking to a real person?');
    expect(text).toMatch(/virtual assistant/i);
    expect(text).toContain('(719) 733-3759');
  });
  it('does not double up "no thanks" or "good thanks" with a thank-you reply', () => {
    expect(talk(['how much for drain cleaning?', 'no thanks']).text).not.toMatch(/welcome|anytime/i);
    expect(talk(['how are you', "i'm good thanks"]).text.split('\n\n')).toHaveLength(1);
  });
  it('says goodbye once', () => {
    expect(ask('thanks, bye!').split('\n\n')).toHaveLength(1);
  });
  it('tells a joke and steers back', () => {
    expect(ask('tell me a joke')).toMatch(/\?/);
  });
  it('apologizes and offers a person when frustrated', () => {
    expect(ask('this is useless')).toMatch(/sorry[\s\S]*733-3759/i);
  });
  it('greets by time of day in Colorado', () => {
    expect(greeting(initialState(), assistant, env).text).toMatch(/^Good morning!/);
    expect(greeting(initialState(), assistant, { now: new Date('2026-09-17T01:00:00Z') }).text).toMatch(
      /^Good evening!/
    );
  });
  it('mentions the service the visitor is reading about', () => {
    expect(greeting(initialState('/services/sewer-repair-colorado-springs/'), assistant, env).text).toMatch(
      /sewer repair/i
    );
  });
});

describe('answers business questions from site facts', () => {
  it.each([
    ['are you open on weekends?', /24 hours a day, 7 days a week|24\/7/],
    ['do you serve castle rock', /Yes, we serve Castle Rock/],
    ['do you come to pueblo', /isn't on our standard service list[\s\S]*733-3759/],
    ['are you licensed and insured', /EC\.0101034[\s\S]*PC\.0001483[\s\S]*MP\.03000387/],
    ['do you offer financing?', /BuyFin[\s\S]*55,000[\s\S]*\/financing\//],
    ['any coupons right now', /\$99 Any Drain Cleaning[\s\S]*\/coupons\//],
    ['is the estimate free?', /estimates are free/i],
    ['are you hiring', /hiring[\s\S]*\/careers\//i],
    ['where is your office', /1304 Market St/],
    ['what is your email', /contact@aphinc\.net/],
    ['do you work on commercial buildings', /homes and businesses/i],
    ['what services do you offer', /Plumbing[\s\S]*Heating & cooling[\s\S]*Electrical[\s\S]*Sewer/],
    ['do you have a warranty', /satisfaction guarantee/i],
    ['do you work on Rheem water heaters', /major brands|water heater/i]
  ])('%s', (question, expected) => {
    expect(ask(question)).toMatch(expected);
  });

  it('never invents a price, and mentions a matching coupon', () => {
    const text = ask('how much does a new water heater cost?');
    expect(text).toMatch(/free, upfront quote/);
    expect(text).toMatch(/\$249 Off Water Heater/);
    expect(text.replace(/\$249|\$55,000/g, '')).not.toMatch(/\$\d/);
  });

  it('hides coupons after they expire', () => {
    const later = respond(initialState(), 'any coupons?', assistant, { now: new Date('2026-10-05T15:00:00Z') }).reply
      .text;
    expect(later).not.toMatch(/\$99 Any Drain Cleaning/);
    expect(later).toMatch(/Seniors & Military/);
  });

  it('does not promise arrival times', () => {
    const text = ask('can someone come out today?');
    expect(text).not.toMatch(/within (an|one|\d) hour|same day/i);
  });

  it('is honest about trades it does not do', () => {
    expect(ask('do you do roofing?')).toMatch(/don't do roofing/i);
  });
});

describe('knowledge from the blog', () => {
  it('answers a how-to question with an article link', () => {
    const text = ask('why is my toilet running constantly?');
    expect(text).toMatch(/flapper/i);
    expect(text).toMatch(/\]\(\/blog\//);
  });
  it('lists the steps for a how-to guide', () => {
    const text = ask('how do I prepare my pipes for winter?');
    expect(text).toMatch(/Insulate Exposed Pipes/);
    expect(text).toMatch(/\n\n\[Read more/);
  });
  it('explains a term', () => {
    expect(ask('what is a SEER rating')).toMatch(/Seasonal Energy Efficiency Ratio/);
  });
  it('adds a safety note for gas or panel DIY questions', () => {
    expect(ask('how do I replace a breaker in my electrical panel')).toMatch(/licensed pro/i);
  });
});

describe('emergencies come first', () => {
  it.each([
    ['I smell gas in the kitchen', /get everyone out[\s\S]*911/i],
    ['my carbon monoxide alarm is going off', /outside[\s\S]*911/i],
    ['outlet is sparking and smoking', /breaker[\s\S]*911/i],
    ['a pipe burst and water is everywhere', /main water valve/i],
    ['sewage backup in my basement', /Stop using water/i]
  ])('%s', (text, advice) => {
    const reply = talk([text]);
    expect(reply.text).toMatch(advice);
    expect(reply.text).toContain('(719) 733-3759');
    expect(reply.state.slots.urgent).toBe(true);
  });
});

describe('collecting a service request', () => {
  it('walks from a described problem to a confirmed lead card', () => {
    const { replies, state } = talk([
      'hey my water heater is leaking all over the garage',
      'yes please',
      'it can wait',
      'Fountain',
      'Jordan Lee',
      '719.555.0100',
      'skip'
    ]);
    expect(replies[0].text).toMatch(/sorry|no fun|frustrating/i);
    expect(replies[1].text).toMatch(/emergency/i);
    expect(replies[3].text).toMatch(/Fountain[\s\S]*area/);
    expect(replies[4].text).toMatch(/Jordan/);
    const lead = replies[6].lead!;
    expect(lead).toMatchObject({
      name: 'Jordan Lee',
      phone: '719.555.0100',
      city: 'Fountain',
      service: 'Water Heater Repair',
      urgent: false
    });
    expect(lead.summary).toMatch(/Water Heater Repair in Fountain/);
    expect(replies[6].text).toMatch(/tap \*\*Send\*\*/);
    expect(state.leadShown).toBe(true);
  });

  it('understands everything given in one message', () => {
    const { replies, state } = talk([
      "I need someone to fix my furnace asap, no heat. I'm Sam Carter, 719-555-0142, in Monument",
      'sam@example.com'
    ]);
    expect(replies[0].text).toMatch(/Sam/);
    expect(replies[0].text).toMatch(/without heat/i);
    expect(state.slots).toMatchObject({ name: 'Sam Carter', phone: '719-555-0142', city: 'Monument', urgent: true });
    expect(replies[1].lead).toMatchObject({ email: 'sam@example.com', service: 'Furnace Repair', urgent: true });
  });

  it('keeps the topic when the visitor agrees to a quote', () => {
    const { state, text } = talk(['do you install ev chargers?', 'how much would that cost', 'ok sure']);
    expect(state.leadMode).toBe(true);
    expect(state.slots.serviceLabel).toBe('EV Charger Installation');
    expect(text).not.toMatch(/what do you need help with/i);
  });

  it('asks again for an incomplete phone number', () => {
    const { text, state } = talk(['I need a plumber', 'no rush', 'Security', 'Pat', '555-0100']);
    expect(text).toMatch(/area code/i);
    expect(state.slots.phone).toBeUndefined();
  });

  it('updates the card when the visitor corrects a detail', () => {
    const { replies } = talk([
      'I need a quote for a new ac',
      'no rush',
      'Parker',
      'Dana',
      '719 555 0188',
      'dana@example.com',
      'actually my number is 719-555-0199'
    ]);
    expect(replies[5].lead?.phone).toBe('719 555 0188');
    expect(replies[6].text).toMatch(/Updated your number/);
    expect(replies[6].lead?.phone).toBe('719-555-0199');
  });

  it('lets the visitor cancel', () => {
    const { state, text } = talk(['I want to schedule a repair', 'never mind']);
    expect(state.leadMode).toBe(false);
    expect(text).toMatch(/cancelled/i);
  });

  it('does not push after the visitor declines', () => {
    const { replies } = talk(['my toilet is clogged', 'no thanks', 'do you do drain cleaning?']);
    expect(replies[2].text).not.toMatch(/Want me to have someone/);
  });

  it('stops asking once the lead is sent', () => {
    let state = talk([
      'call me back please',
      'toilet repair',
      'no rush',
      'Fountain',
      'Lee',
      '7195550100',
      'skip'
    ]).state;
    state = markLeadSent(state);
    const after = respond(state, 'thanks!', assistant, env);
    expect(after.reply.text).not.toMatch(/name|phone/i);
    expect(after.reply.lead).toBeUndefined();
  });

  it('never shows a lead card without a valid phone and a name', () => {
    const lines = ['I need a plumber', 'emergency', 'Monument', 'Chris', 'skip', 'skip', 'yes'];
    for (const r of talk(lines).replies) expect(r.lead).toBeUndefined();
  });
});

describe('staying in context', () => {
  it('keeps the specific service when a follow-up is vague', () => {
    const { state, text } = talk(['my ac', "it's not cooling"]);
    expect(state.slots.serviceLabel).toBe('AC Repair');
    expect(text).not.toMatch(/cooling repair/i);
  });

  it('answers "what causes that" using the problem already described', () => {
    const { text } = talk(['water heater making popping noise', 'what causes that']);
    expect(text).toMatch(/sediment/i);
  });

  it('treats a scheduling answer after an offer as a yes', () => {
    const { state } = talk(['my ac is not cooling', 'tomorrow is fine']);
    expect(state.leadMode).toBe(true);
    expect(state.slots.urgent).toBe(false);
  });

  it('greets a visitor who introduces themselves in one line', () => {
    const { text, state } = talk(["hi I'm Jordan"]);
    expect(state.slots.name).toBe('Jordan');
    expect(text.split('\n\n')).toHaveLength(1);
    expect(text).toMatch(/Jordan/);
  });

  it('does not mistake "my cell is" for a name', () => {
    const { state } = talk(['I need a plumber', 'no rush', 'Fountain', 'Alex Kim', 'my cell is 719 555 0111']);
    expect(state.slots.name).toBe('Alex Kim');
  });

  it('start over clears everything', () => {
    const { state } = talk(['my furnace is broken', 'Monument', 'start over']);
    expect(state.slots).toEqual({});
    expect(state.leadMode).toBe(false);
    expect(state.topicSlug).toBeUndefined();
  });

  it('confirms the city named inside a service question', () => {
    const text = ask('do you do drain cleaning in Monument');
    expect(text).toMatch(/drain cleaning/i);
    expect(text).toMatch(/serve Monument/);
  });

  it('is straight about septic tanks', () => {
    const text = ask('do you pump septic tanks');
    expect(text).toMatch(/don't pump/i);
    expect(text).toMatch(/sewer/i);
  });

  it('answers how long a job takes without promising a schedule', () => {
    const text = ask('how long does it take');
    expect(text).toMatch(/depends on the job/i);
    expect(text.split('\n\n')).toHaveLength(1);
  });

  it('answers the senior discount specifically', () => {
    const text = ask('do you have a senior discount?');
    expect(text).toMatch(/Seniors & Military/);
    expect(text).not.toMatch(/Drain Cleaning/);
  });

  it('answers who owns the company without inventing an owner', () => {
    const text = ask('who owns the company?');
    expect(text).toMatch(/don't have details about ownership/i);
    expect(text).toMatch(/\/about-us\//);
  });
});

describe('robustness', () => {
  it('asks for clarification, then offers a person, on gibberish', () => {
    const { replies } = talk(['asdkjh qwe', 'blorp']);
    expect(replies[0].text).toMatch(/not quite sure|didn't quite catch/i);
    expect(replies[1].text).toMatch(/733-3759/);
  });
  it('handles empty and very long input', () => {
    expect(ask('   ')).toBeTruthy();
    expect(ask('water heater '.repeat(400))).toBeTruthy();
  });
  it('treats visitor text as text, never markup', () => {
    const text = ask('<script>alert(1)</script> my drain is clogged');
    expect(text).not.toContain('<script>');
  });
  it('answers two questions in one message', () => {
    const text = ask('do you serve Monument and are you open on Sundays?');
    expect(text).toMatch(/Monument/);
    expect(text).toMatch(/24 hours|24\/7/);
  });
});
