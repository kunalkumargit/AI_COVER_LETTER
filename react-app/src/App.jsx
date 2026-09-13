import React, { useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import ReactMarkdown from 'react-markdown';
import * as pdfjsLib from 'pdfjs-dist';

// Set worker source for PDF.js parsing
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export default function CoverLetterApp() {
  // Phase 1: State Initialization
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    company: '',
    skills: '',
    jobDescription: '',
  });

  const [resumeText, setResumeText] = useState('');
  const [output, setOutput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isPdfProcessing, setIsPdfProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Handle controlled input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Phase 3: Client-side PDF Text Extraction
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || file.type !== 'application/pdf') {
      setErrorMessage('Please upload a valid PDF file.');
      return;
    }

    setIsPdfProcessing(true);
    setErrorMessage('');

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let extractedText = '';

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item) => item.str).join(' ');
        extractedText += pageText + '\n';
      }

      setResumeText(extractedText.trim());
    } catch (err) {
      console.error('PDF parsing error:', err);
      setErrorMessage('Failed to read PDF file. Try again.');
    } finally {
      setIsPdfProcessing(false);
    }
  };

  // Phase 1: Local Template Simulation (Fallback)
  const generateSimulatedLetter = () => {
    return `Dear Hiring Manager at ${formData.company || '[Company]'},\n\n` +
      `I am writing to express my strong interest in the ${formData.role || '[Role]'} position. ` +
      `With a proven background in ${formData.skills || '[Key Skills]'}, I am confident in my ability to deliver immediate value to your engineering team.\n\n` +
      `Throughout my career, I have consistently focused on building scalable, reliable solutions. ` +
      `Given the requirements outlined in your job description, my background directly aligns with your goals.\n\n` +
      `Thank you for your time and consideration. I look forward to discussing how my experience fits your needs.\n\n` +
      `Sincerely,\n${formData.name || '[Your Name]'}`;
  };

  // Phase 2 & 3: Gemini API Integration with Prompt Engineering
  const handleGenerate = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');
    setOutput('');

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    // Fallback to Phase 1 data simulation if API key is missing
    if (!apiKey) {
      console.warn('VITE_GEMINI_API_KEY missing. Falling back to local data simulation.');
      setTimeout(() => {
        setOutput(generateSimulatedLetter());
        setIsLoading(false);
      }, 1000);
      return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      
      // Programmatic Prompt Payload
      const prompt = `
        You are a expert executive career coach. Draft a compelling, professional, and tailored cover letter.

        CANDIDATE DETAILS:
        - Name: ${formData.name}
        - Job Role: ${formData.role}
        - Target Company: ${formData.company}
        - Highlighted Skills: ${formData.skills}
        ${resumeText ? `- Extracted Resume Context:\n${resumeText}` : ''}

        JOB DESCRIPTION:
        ${formData.jobDescription || 'Not provided. Base letter strictly on the highlighted skills and target role.'}

        GUIDELINES:
        - Keep the tone professional, persuasive, and authentic.
        - Emphasize how the candidate's skills solve the target company's goals.
        - Structure output using clean Markdown with distinct paragraphs.
        - Do NOT include placeholder headers like "[Date]" or "[Address]" unless formatted smoothly into text.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      setOutput(response.text);
    } catch (err) {
      console.error('LLM API Error:', err);
      setErrorMessage('Failed to generate cover letter. Falling back to template.');
      setOutput(generateSimulatedLetter());
    } finally {
      setIsLoading(false);
    }
  };

  // Phase 1: Clipboard Utility
  const copyToClipboard = async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="border-b border-slate-800 pb-6">
          <h1 className="text-3xl font-bold tracking-tight text-indigo-400">
            AI Cover Letter Generator
          </h1>
          <p className="text-slate-400 mt-1">
            Build tailored cover letters using Google Gemini API.
          </p>
        </header>

        {/* Workspace Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Form Input Section */}
          <form onSubmit={handleGenerate} className="space-y-5 bg-slate-800/50 p-6 rounded-xl border border-slate-700/60">
            <h2 className="text-xl font-semibold text-slate-200">Candidate & Job Details</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                  Candidate Name *
                </label>
                <input
                  required
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. kunal singh"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                  Job Role *
                </label>
                <input
                  required
                  type="text"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  placeholder="e.g. Software Engineer"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                Target Company *
              </label>
              <input
                required
                type="text"
                name="company"
                value={formData.company}
                onChange={handleChange}
                placeholder="e.g. Stripe"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                Key Skills*
              </label>
              <input
                required
                type="text"
                name="skills"
                value={formData.skills}
                onChange={handleChange}
                placeholder="eg.. React, TypeScript, Tailwind, Node.js, System Design"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                Job Description
              </label>
              <textarea
                rows="4"
                name="jobDescription"
                value={formData.jobDescription}
                onChange={handleChange}
                placeholder="Paste the job description here to generate contextualized output..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>

            {/* Phase 3: PDF Resume File Upload */}
            <div className="pt-2 border-t border-slate-700/50">
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                Upload Resume
              </label>
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                disabled={isPdfProcessing}
                className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-600/20 file:text-indigo-400 hover:file:bg-indigo-600/30 cursor-pointer disabled:opacity-50"
              />
              {isPdfProcessing && <p className="text-xs text-indigo-400 mt-1">Extracting text from PDF...</p>}
              {resumeText && <p className="text-xs text-emerald-400 mt-1">✓ Resume context successfully parsed!</p>}
            </div>

            {errorMessage && (
              <p className="text-sm text-red-400 bg-red-950/40 p-2 rounded border border-red-800/50">{errorMessage}</p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 rounded-lg transition-colors duration-200 disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Generating Cover Letter...</span>
                </>
              ) : (
                <span>Generate Cover Letter</span>
              )}
            </button>
          </form>

          {/* Phase 1 & 3: Output Display Panel */}
          <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/60 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-700">
                <h2 className="text-xl font-semibold text-slate-200">Generated Cover Letter</h2>
                {output && (
                  <button
                    onClick={copyToClipboard}
                    className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1.5 rounded-md transition-colors"
                  >
                    {copied ? '✓ Copied' : 'Copy to Clipboard'}
                  </button>
                )}
              </div>

              <div className="mt-4 text-slate-300 text-sm leading-relaxed min-h-[300px]">
                {isLoading ? (
                  <div className="animate-pulse space-y-3 pt-4">
                    <div className="h-4 bg-slate-700 rounded w-1/4"></div>
                    <div className="h-4 bg-slate-700 rounded w-full"></div>
                    <div className="h-4 bg-slate-700 rounded w-5/6"></div>
                    <div className="h-4 bg-slate-700 rounded w-4/6"></div>
                  </div>
                ) : output ? (
                  <div className="prose prose-invert prose-sm max-w-none space-y-4">
                    <ReactMarkdown>{output}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-slate-500 italic pt-10 text-center">
                    Fill in your details and click generate to build your cover letter.
                  </p>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
