import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

// Initialize Google GenAI SDK (uses GEMINI_API_KEY environment variable)
const ai = new GoogleGenAI();

// API Endpoint for AI Report Generation
app.post('/api/generate-report', async (req, res) => {
  try {
    const { reportType, title, period, context, financialData } = req.body;

    const prompt = `أنت خبير تربوي وإداري متألق ومستشار في مادة التربية البدنية والرياضية والجمعية الرياضية المدرسية بالأسلاك التعليمية في المغرب.
قم بإنشاء وصياغة تقرير رسمي، مفصل، واحترافي باللغة العربية بدقة عالية.

معطيات التقرير المطلوب:
- نوع التقرير: ${reportType === 'financial' ? 'تقرير مالي وميزانية' : reportType === 'moral' ? 'تقرير أدبي وحصيلة الأنشطة والبطولات' : 'تقرير بيداغوجي وملاحظات انضباط/تأطير'}
- العنوان/الموضوع: ${title || 'تقرير الجمعية الرياضية المدرسية'}
- الفترة أو الموسم الدراسي: ${period || 'الموسم الدراسي الحالي'}
${context ? `- المعطيات والسياق المضاف من المدرس: ${context}` : ''}
${financialData ? `- البيانات المالية (المداخيل والمصاريف): ${JSON.stringify(financialData)}` : ''}

قواعد الصياغة:
1. صياغة التقرير بلغة عربية رسمية فصيحة، رصينة، ومباشرة تناسب الإدارة التربوية والمديرية الإقليمية.
2. يتكون التقرير من:
   - تمهيد ومقدمة رسمية تؤطر النشاط أو الموسم الدراسي.
   - عرض مفصل يتضمن حركية التلاميذ، الأنشطة المنجزة، النتائج، أو التفاصيل المالية والحسابية.
   - خلاصة وتوصيات مستقبلية لتعزيز الرياضة المدرسية بالجمعية.
3. عدم إدراج وسم Markdown معقد، اجعل النص منسقاً بفقرات واضحة وخطوط منظمة تمكن الأستاذ من نسخه وطباعته أو تصديره لوورد مباشرة.`;

    const candidateModels = [
      'gemini-3.8-flash',
      'gemini-flash-latest',
      'gemini-3.1-flash-lite'
    ];

    let generatedText = '';
    let lastError: any = null;

    for (const modelName of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
        });
        if (response.text) {
          generatedText = response.text;
          break;
        }
      } catch (err: any) {
        console.warn(`Gemini model ${modelName} hit error, attempting fallback model...`, err?.message || err);
        lastError = err;
      }
    }

    if (!generatedText) {
      throw lastError || new Error('الخدمة تشهد ضغطاً مؤقتاً عالية. يرجى إعادة المحاولة بعد بضع ثوانٍ.');
    }

    res.json({ success: true, text: generatedText });
  } catch (error: any) {
    console.error('Error generating report with Gemini AI:', error);
    res.status(500).json({ 
      success: false, 
      error: error?.message || 'تعذر إنشاء التقرير بواسطة الذكاء الاصطناعي. يرجى التأكد من الاتصال بالإنترنت ومعاودة المحاولة.' 
    });
  }
});

// Setup Vite middleware for development
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (_req, res) => {
      res.sendFile('index.html', { root: 'dist' });
    });
  }

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
