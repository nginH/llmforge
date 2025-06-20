class TestData {
   static getEmptyContent() {
      return [];
   }

   static getMalformedContent() {
      return [{ role: 'user' }, { parts: [{ text: 'test' }] }];
   }

   static getComplexContent() {
      return [
         {
            role: 'user',
            parts: [{ text: 'Tell me about machine learning in 50 words.' }],
         },
         {
            role: 'model',
            parts: [{ text: 'Machine learning is a subset of AI that enables computers to learn and make decisions from data without explicit programming.' }],
         },
         {
            role: 'user',
            parts: [{ text: 'Can you give me an example?' }],
         },
      ];
   }
   static getValidContent() {
      return [
         {
            role: 'user',
            parts: [{ text: 'hii my name is harsh?' }],
         },
      ];
   }
}
module.exports = { TestData };
