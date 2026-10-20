import { Book, Chapter } from './types';
import { db } from './db';

// High quality SVG covers encoded as data URLs
const ALICE_COVER = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600"><rect width="100%" height="100%" fill="%231E293B"/><rect x="20" y="20" width="360" height="560" fill="none" stroke="%2338BDF8" stroke-width="2" stroke-opacity="0.3"/><circle cx="200" cy="220" r="80" fill="%230F172A" stroke="%2338BDF8" stroke-width="1.5"/><path d="M170 200 L230 200 L200 250 Z" fill="%2338BDF8" opacity="0.8"/><text x="200" y="360" fill="%23F8FAFC" font-family="Georgia, serif" font-size="28" font-weight="bold" text-anchor="middle">Alice in Wonderland</text><text x="200" y="400" fill="%2394A3B8" font-family="sans-serif" font-size="16" letter-spacing="3" text-anchor="middle">LEWIS CARROLL</text><text x="200" y="530" fill="%2338BDF8" font-family="sans-serif" font-size="11" letter-spacing="4" text-anchor="middle">CLASSIC EDITION</text></svg>`;

const METAMORPHOSIS_COVER = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600"><rect width="100%" height="100%" fill="%2318181B"/><rect x="20" y="20" width="360" height="560" fill="none" stroke="%23E4E4E7" stroke-width="1.5" stroke-opacity="0.2"/><path d="M200 140 L230 220 L170 220 Z" fill="%23E4E4E7" opacity="0.8"/><circle cx="200" cy="245" r="12" fill="%23E4E4E7"/><text x="200" y="360" fill="%23FAFAFA" font-family="Georgia, serif" font-size="30" font-weight="bold" text-anchor="middle">The Metamorphosis</text><text x="200" y="400" fill="%23A1A1AA" font-family="sans-serif" font-size="16" letter-spacing="3" text-anchor="middle">FRANZ KAFKA</text><text x="200" y="530" fill="%23E4E4E7" font-family="sans-serif" font-size="11" letter-spacing="4" text-anchor="middle">UNABRIDGED TRANSLATION</text></svg>`;

const GATSBY_COVER = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600"><rect width="100%" height="100%" fill="%230A192F"/><rect x="20" y="20" width="360" height="560" fill="none" stroke="%23FCD34D" stroke-width="2" stroke-opacity="0.4"/><polygon points="200,160 225,210 280,218 240,257 249,312 200,286 151,312 160,257 120,218 175,210" fill="none" stroke="%23FCD34D" stroke-width="1.5"/><text x="200" y="370" fill="%23FEF3C7" font-family="Georgia, serif" font-size="28" font-weight="bold" text-anchor="middle">The Great Gatsby</text><text x="200" y="410" fill="%23D1D5DB" font-family="sans-serif" font-size="16" letter-spacing="3" text-anchor="middle">F. SCOTT FITZGERALD</text><text x="200" y="530" fill="%23FCD34D" font-family="sans-serif" font-size="11" letter-spacing="4" text-anchor="middle">THE JAZZ AGE</text></svg>`;

export const SAMPLE_BOOKS: Array<{ book: Book; chapters: Chapter[] }> = [
  {
    book: {
      id: 'sample-alice-in-wonderland',
      title: "Alice's Adventures in Wonderland",
      author: 'Lewis Carroll',
      coverUrl: ALICE_COVER,
      format: 'epub',
      fileSize: 184500,
      totalWords: 3420,
      totalChapters: 3,
      status: 'reading',
      readingProgress: 24,
      currentChapterIndex: 0,
      currentParagraphIndex: 0,
      currentWordIndex: 0,
      currentAudioTimestamp: 0,
      lastReadAt: Date.now() - 3600000,
      createdAt: Date.now() - 86400000,
    },
    chapters: [
      {
        id: 'sample-alice-ch-0',
        bookId: 'sample-alice-in-wonderland',
        order: 0,
        title: 'Chapter I: Down the Rabbit-Hole',
        wordCount: 1140,
        rawText: `Alice was beginning to get very tired of sitting by her sister on the bank, and of having nothing to do: once or twice she had peeped into the book her sister was reading, but it had no pictures or conversations in it, "and what is the use of a book," thought Alice "without pictures or conversations?"

So she was considering in her own mind (as well as she could, for the hot day made her feel very sleepy and stupid), whether the pleasure of making a daisy-chain would be worth the trouble of getting up and picking the daisies, when suddenly a White Rabbit with pink eyes ran close by her.

There was nothing so very remarkable in that; nor did Alice think it so very much out of the way to hear the Rabbit say to itself, "Oh dear! Oh dear! I shall be late!" (when she thought it over afterwards, it occurred to her that she ought to have wondered at this, but at the time it all seemed quite natural); but when the Rabbit actually took a watch out of its waistcoat-pocket, and looked at it, and then hurried on, Alice started to her feet, for it flashed across her mind that she had never before seen a rabbit with either a waistcoat-pocket, or a watch to take out of it, and burning with curiosity, she ran across the field after it, and fortunately was just in time to see it pop down a large rabbit-hole under the hedge.

In another moment down went Alice after it, never once considering how in the world she was to get out again.

The rabbit-hole went straight on like a tunnel for some way, and then dipped suddenly down, so suddenly that Alice had not a moment to think about stopping herself before she found herself falling down a very deep well.

Either the well was very deep, or she fell very slowly, for she had plenty of time as she went down to look about her and to wonder what was going to happen next. First, she tried to look down and make out what she was coming to, but it was too dark to see anything; then she looked at the sides of the well, and noticed that they were filled with cupboards and book-shelves; here and there she saw maps and pictures hung upon pegs. She took down a jar from one of the shelves as she passed; it was labelled "ORANGE MARMALADE", but to her great disappointment it was empty: she did not like to drop the jar for fear of killing somebody underneath, so managed to put it into one of the cupboards as she fell past it.`,
        content: `<p data-p-idx="0" class="leading-relaxed my-3">Alice was beginning to get very tired of sitting by her sister on the bank, and of having nothing to do: once or twice she had peeped into the book her sister was reading, but it had no pictures or conversations in it, "and what is the use of a book," thought Alice "without pictures or conversations?"</p>
<p data-p-idx="1" class="leading-relaxed my-3">So she was considering in her own mind (as well as she could, for the hot day made her feel very sleepy and stupid), whether the pleasure of making a daisy-chain would be worth the trouble of getting up and picking the daisies, when suddenly a White Rabbit with pink eyes ran close by her.</p>
<p data-p-idx="2" class="leading-relaxed my-3">There was nothing so very remarkable in that; nor did Alice think it so very much out of the way to hear the Rabbit say to itself, "Oh dear! Oh dear! I shall be late!" (when she thought it over afterwards, it occurred to her that she ought to have wondered at this, but at the time it all seemed quite natural); but when the Rabbit actually took a watch out of its waistcoat-pocket, and looked at it, and then hurried on, Alice started to her feet, for it flashed across her mind that she had never before seen a rabbit with either a waistcoat-pocket, or a watch to take out of it, and burning with curiosity, she ran across the field after it, and fortunately was just in time to see it pop down a large rabbit-hole under the hedge.</p>
<p data-p-idx="3" class="leading-relaxed my-3">In another moment down went Alice after it, never once considering how in the world she was to get out again.</p>
<p data-p-idx="4" class="leading-relaxed my-3">The rabbit-hole went straight on like a tunnel for some way, and then dipped suddenly down, so suddenly that Alice had not a moment to think about stopping herself before she found herself falling down a very deep well.</p>
<p data-p-idx="5" class="leading-relaxed my-3">Either the well was very deep, or she fell very slowly, for she had plenty of time as she went down to look about her and to wonder what was going to happen next. First, she tried to look down and make out what she was coming to, but it was too dark to see anything; then she looked at the sides of the well, and noticed that they were filled with cupboards and book-shelves; here and there she saw maps and pictures hung upon pegs. She took down a jar from one of the shelves as she passed; it was labelled "ORANGE MARMALADE", but to her great disappointment it was empty: she did not like to drop the jar for fear of killing somebody underneath, so managed to put it into one of the cupboards as she fell past it.</p>`,
      },
      {
        id: 'sample-alice-ch-1',
        bookId: 'sample-alice-in-wonderland',
        order: 1,
        title: 'Chapter II: The Pool of Tears',
        wordCount: 1120,
        rawText: `"Curiouser and curiouser!" cried Alice (she was so much surprised, that for the moment she quite forgot how to speak good English); "now I'm opening out like the largest telescope that ever was! Good-bye, feet!" (for when she looked down at her feet, they seemed to be almost out of sight, they were getting so far off).

"Oh, my poor little feet, I wonder who will put on your shoes and stockings for you now, dears? I'm sure I shan't be able! I shall be a great deal too far off to trouble myself about you: you must manage the best way you can;—but I must be kind to them," thought Alice, "or perhaps they won't walk the way I want to go! Let me see: I'll give them a new pair of boots every Christmas."

Just then her head struck against the roof of the hall: in fact she was now more than nine feet high, and she at once took up the little golden key and hurried off to the garden door.

Poor Alice! It was as much as she could do, lying down on one side, to look through into the garden with one eye; but to get through was more hopeless than ever: she sat down and began to cry again.`,
        content: `<p data-p-idx="0" class="leading-relaxed my-3">"Curiouser and curiouser!" cried Alice (she was so much surprised, that for the moment she quite forgot how to speak good English); "now I'm opening out like the largest telescope that ever was! Good-bye, feet!" (for when she looked down at her feet, they seemed to be almost out of sight, they were getting so far off).</p>
<p data-p-idx="1" class="leading-relaxed my-3">"Oh, my poor little feet, I wonder who will put on your shoes and stockings for you now, dears? I'm sure I shan't be able! I shall be a great deal too far off to trouble myself about you: you must manage the best way you can;—but I must be kind to them," thought Alice, "or perhaps they won't walk the way I want to go! Let me see: I'll give them a new pair of boots every Christmas."</p>
<p data-p-idx="2" class="leading-relaxed my-3">Just then her head struck against the roof of the hall: in fact she was now more than nine feet high, and she at once took up the little golden key and hurried off to the garden door.</p>
<p data-p-idx="3" class="leading-relaxed my-3">Poor Alice! It was as much as she could do, lying down on one side, to look through into the garden with one eye; but to get through was more hopeless than ever: she sat down and began to cry again.</p>`,
      },
      {
        id: 'sample-alice-ch-2',
        bookId: 'sample-alice-in-wonderland',
        order: 2,
        title: 'Chapter III: A Caucus-Race and a Long Tale',
        wordCount: 1160,
        rawText: `They were indeed a queer-looking party that assembled on the bank—the birds with draggled feathers, the animals with their fur clinging close to them, and all dripping wet, cross, and uncomfortable.

The first question of course was, how to get dry again: they had a consultation about this, and after a few minutes it seemed quite natural to Alice to find herself talking familiarly with them, as if she had known them all her life. Indeed, she had quite a long argument with the Lory, who at last turned sulky, and would only say, "I am older than you, and must know better"; and this Alice would not allow without knowing how old it was, and, as the Lory positively refused to tell its age, there was no more to be said.

At last the Mouse, who seemed to be a person of authority among them, called out, "Sit down, all of you, and listen to me! I'll soon make you dry enough!" They all sat down at once, in a large ring, with the Mouse in the middle. Alice kept her eyes anxiously fixed on it, for she felt sure she would catch a bad cold if she did not get dry very soon.`,
        content: `<p data-p-idx="0" class="leading-relaxed my-3">They were indeed a queer-looking party that assembled on the bank—the birds with draggled feathers, the animals with their fur clinging close to them, and all dripping wet, cross, and uncomfortable.</p>
<p data-p-idx="1" class="leading-relaxed my-3">The first question of course was, how to get dry again: they had a consultation about this, and after a few minutes it seemed quite natural to Alice to find herself talking familiarly with them, as if she had known them all her life. Indeed, she had quite a long argument with the Lory, who at last turned sulky, and would only say, "I am older than you, and must know better"; and this Alice would not allow without knowing how old it was, and, as the Lory positively refused to tell its age, there was no more to be said.</p>
<p data-p-idx="2" class="leading-relaxed my-3">At last the Mouse, who seemed to be a person of authority among them, called out, "Sit down, all of you, and listen to me! I'll soon make you dry enough!" They all sat down at once, in a large ring, with the Mouse in the middle. Alice kept her eyes anxiously fixed on it, for she felt sure she would catch a bad cold if she did not get dry very soon.</p>`,
      },
    ],
  },
  {
    book: {
      id: 'sample-the-metamorphosis',
      title: 'The Metamorphosis',
      author: 'Franz Kafka',
      coverUrl: METAMORPHOSIS_COVER,
      format: 'pdf',
      fileSize: 142000,
      totalWords: 2840,
      totalChapters: 2,
      status: 'want_to_read',
      readingProgress: 0,
      currentChapterIndex: 0,
      currentParagraphIndex: 0,
      currentWordIndex: 0,
      currentAudioTimestamp: 0,
      lastReadAt: Date.now() - 172800000,
      createdAt: Date.now() - 172800000,
    },
    chapters: [
      {
        id: 'sample-meta-ch-0',
        bookId: 'sample-the-metamorphosis',
        order: 0,
        title: 'Part I: The Awakening',
        wordCount: 1420,
        rawText: `One morning, when Gregor Samsa woke from troubled dreams, he found himself transformed in his bed into a horrible vermin. He lay on his armour-like back, and if he lifted his head a little he could see his brown belly, slightly domed and divided by arches into stiff sections. The bedding was hardly able to cover it and seemed ready to slide off any moment. His many legs, pitifully thin compared with the size of the rest of him, waved about helplessly as he looked.

"What's happened to me?" he thought. It wasn't a dream. His room, a proper human room although a little too small, lay peacefully between its four familiar walls. A collection of textile samples lay spread out on the table—Samsa was a travelling salesman—and above it there hung a picture that he had recently cut out of an illustrated magazine and housed in a nice, gilded frame. It showed a lady fitted out with a fur hat and fur boa who sat upright, raising a heavy fur muff that covered the whole of her lower arm towards the viewer.

Gregor then turned to look out the window at the dull weather. Drops of rain could be heard hitting the pane, which made him feel quite sad. "How about if I sleep a little bit longer and forget all this nonsense", he thought, but that was something he was unable to do because he was used to sleeping on his right, and in his present state he couldn't get into that position.`,
        content: `<p data-p-idx="0" class="leading-relaxed my-3">One morning, when Gregor Samsa woke from troubled dreams, he found himself transformed in his bed into a horrible vermin. He lay on his armour-like back, and if he lifted his head a little he could see his brown belly, slightly domed and divided by arches into stiff sections. The bedding was hardly able to cover it and seemed ready to slide off any moment. His many legs, pitifully thin compared with the size of the rest of him, waved about helplessly as he looked.</p>
<p data-p-idx="1" class="leading-relaxed my-3">"What's happened to me?" he thought. It wasn't a dream. His room, a proper human room although a little too small, lay peacefully between its four familiar walls. A collection of textile samples lay spread out on the table—Samsa was a travelling salesman—and above it there hung a picture that he had recently cut out of an illustrated magazine and housed in a nice, gilded frame. It showed a lady fitted out with a fur hat and fur boa who sat upright, raising a heavy fur muff that covered the whole of her lower arm towards the viewer.</p>
<p data-p-idx="2" class="leading-relaxed my-3">Gregor then turned to look out the window at the dull weather. Drops of rain could be heard hitting the pane, which made him feel quite sad. "How about if I sleep a little bit longer and forget all this nonsense", he thought, but that was something he was unable to do because he was used to sleeping on his right, and in his present state he couldn't get into that position.</p>`,
      },
      {
        id: 'sample-meta-ch-1',
        bookId: 'sample-the-metamorphosis',
        order: 1,
        title: 'Part II: The Household',
        wordCount: 1420,
        rawText: `It was not until it was getting dark that evening that Gregor awoke from his deep and coma-like sleep. He would certainly have woken up not much later anyhow, even without any disturbance, as he felt sufficiently rested, but it seemed to him as if he had been woken by hurried steps and the sound of the door leading to the hall being cautiously closed.

The light from the electric street lamps shone in patches on the ceiling and the higher parts of the furniture, but down below where Gregor was it was dark. Slowly, awkward with his feelers, which he was now learning to value, he pushed himself over to the door to see what had been going on.

His left side seemed one single long, unpleasantly taut scar, and he had to limp on his two rows of legs. One of the legs had also been badly injured in the course of the morning—it was almost a miracle that only one had been injured—and crawled helplessly behind him.`,
        content: `<p data-p-idx="0" class="leading-relaxed my-3">It was not until it was getting dark that evening that Gregor awoke from his deep and coma-like sleep. He would certainly have woken up not much later anyhow, even without any disturbance, as he felt sufficiently rested, but it seemed to him as if he had been woken by hurried steps and the sound of the door leading to the hall being cautiously closed.</p>
<p data-p-idx="1" class="leading-relaxed my-3">The light from the electric street lamps shone in patches on the ceiling and the higher parts of the furniture, but down below where Gregor was it was dark. Slowly, awkward with his feelers, which he was now learning to value, he pushed himself over to the door to see what had been going on.</p>
<p data-p-idx="2" class="leading-relaxed my-3">His left side seemed one single long, unpleasantly taut scar, and he had to limp on his two rows of legs. One of the legs had also been badly injured in the course of the morning—it was almost a miracle that only one had been injured—and crawled helplessly behind him.</p>`,
      },
    ],
  },
  {
    book: {
      id: 'sample-the-great-gatsby',
      title: 'The Great Gatsby',
      author: 'F. Scott Fitzgerald',
      coverUrl: GATSBY_COVER,
      format: 'txt',
      fileSize: 98000,
      totalWords: 1950,
      totalChapters: 1,
      status: 'completed',
      readingProgress: 100,
      currentChapterIndex: 0,
      currentParagraphIndex: 0,
      currentWordIndex: 0,
      currentAudioTimestamp: 0,
      lastReadAt: Date.now() - 360000000,
      createdAt: Date.now() - 360000000,
    },
    chapters: [
      {
        id: 'sample-gatsby-ch-0',
        bookId: 'sample-the-great-gatsby',
        order: 0,
        title: 'Chapter 1: The Green Light',
        wordCount: 1950,
        rawText: `In my younger and more vulnerable years my father gave me some advice that I've been turning over in my mind ever since.

"Whenever you feel like criticizing any one," he told me, "just remember that all the people in this world haven't had the advantages that you've had."

He didn't say any more, but we've always been unusually communicative in a reserved way, and I understood that he meant a great deal more than that. In consequence, I'm inclined to reserve all judgements, a habit that has opened up many curious natures to me and also made me the victim of not a few veteran bores. The abnormal mind is quick to detect and attach itself to this quality when it appears in a normal person, and so it came about that in college I was unjustly accused of being a politician, because I was privy to the secret griefs of wild, unknown men.

And, after boasting this way of my tolerance, I come to the admission that it has a limit. Conduct may be founded on the hard rock or the wet marshes, but after a certain point I don't care what it's founded on. When I came back from the East last autumn I felt that I wanted the world to be in uniform and at a sort of moral attention forever; I wanted no more riotous excursions with privileged glimpses into the human heart. Only Gatsby, the man who gives his name to this book, was exempt from my reaction—Gatsby, who represented everything for which I have an unaffected scorn.`,
        content: `<p data-p-idx="0" class="leading-relaxed my-3">In my younger and more vulnerable years my father gave me some advice that I've been turning over in my mind ever since.</p>
<p data-p-idx="1" class="leading-relaxed my-3">"Whenever you feel like criticizing any one," he told me, "just remember that all the people in this world haven't had the advantages that you've had."</p>
<p data-p-idx="2" class="leading-relaxed my-3">He didn't say any more, but we've always been unusually communicative in a reserved way, and I understood that he meant a great deal more than that. In consequence, I'm inclined to reserve all judgements, a habit that has opened up many curious natures to me and also made me the victim of not a few veteran bores. The abnormal mind is quick to detect and attach itself to this quality when it appears in a normal person, and so it came about that in college I was unjustly accused of being a politician, because I was privy to the secret griefs of wild, unknown men.</p>
<p data-p-idx="3" class="leading-relaxed my-3">And, after boasting this way of my tolerance, I come to the admission that it has a limit. Conduct may be founded on the hard rock or the wet marshes, but after a certain point I don't care what it's founded on. When I came back from the East last autumn I felt that I wanted the world to be in uniform and at a sort of moral attention forever; I wanted no more riotous excursions with privileged glimpses into the human heart. Only Gatsby, the man who gives his name to this book, was exempt from my reaction—Gatsby, who represented everything for which I have an unaffected scorn.</p>`,
      },
    ],
  },
];

export async function seedSampleBooksIfEmpty(force: boolean = false): Promise<void> {
  try {
    if (typeof window !== 'undefined') {
      const alreadyInitialized = localStorage.getItem('audbook_has_seeded_samples');
      // If user has already visited and deleted books, do not resurrect them unless explicitly forced
      if (!force && alreadyInitialized === 'true') {
        return;
      }
    }

    const count = await db.books.count();
    if (count === 0 || force) {
      for (const item of SAMPLE_BOOKS) {
        await db.books.put(item.book);
        for (const ch of item.chapters) {
          await db.chapters.put(ch);
        }
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem('audbook_has_seeded_samples', 'true');
      }
    }
  } catch (err) {
    console.error('Error seeding sample books:', err);
  }
}

export async function restoreSampleBooks(): Promise<void> {
  return seedSampleBooksIfEmpty(true);
}
