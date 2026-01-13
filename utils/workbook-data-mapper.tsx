export interface WorkbookJSON {
  lesson_number: string;
  lesson_title: string;
  level_name: string;
  cefr_level: string;
  article_type: string;
  genre: string;
  vocabulary: {
    word: string;
    phonetic: string;
    definition: string;
  }[];
  article_image_url: string[];
  article_caption: string;
  article_url?: string;
  article_paragraphs: {
    number: number;
    text: string;
  }[];
  comprehension_questions: {
    number: number;
    question: string;
    options: string[];
  }[];
  short_answer_question: string;
  sentence_starters: string[];
  vocab_match: any[]; // To be implemented or left empty
  vocab_fill: any[]; // To be implemented or left empty
  vocab_word_bank: string[];
  sentence_order_questions: any[];
  sentence_completion_prompts: any[];
  writing_prompt: string;
  mc_answers: any[];
  vocab_match_answer_string: string;
  vocab_fill_answer_string: string;
  sentence_order_answers: any[];
  translation_paragraphs: {
    label: string;
    text: string;
  }[];
}
