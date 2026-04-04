import { useState, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useUploadStatement } from '@/api/hooks';
import { useSites } from '@/api/hooks';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/utils/cn';
import type { UploadResult } from '@/types';

const uploadSchema = z.object({
  siteId: z.string().min(1, 'Please select a site'),
  statementType: z.enum(['income_statement', 'balance_sheet', 'cash_flow'], {
    required_error: 'Please select a statement type',
  }),
  year: z.number().min(2000).max(2100),
  month: z.number().min(1).max(12),
});

type UploadFormData = z.infer<typeof uploadSchema>;

const ACCEPTED_FILE_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
];

const ACCEPTED_EXTENSIONS = ['.xlsx', '.xls', '.csv'];

export function UploadForm() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: sites } = useSites();
  const uploadMutation = useUploadStatement();

  const currentYear = new Date().getFullYear();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<UploadFormData>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      year: currentYear,
      month: new Date().getMonth() + 1,
    },
  });

  const validateFile = (file: File): boolean => {
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(extension)) {
      setFileError(`Invalid file type. Accepted: ${ACCEPTED_EXTENSIONS.join(', ')}`);
      return false;
    }
    if (file.size > 10 * 1024 * 1024) {
      setFileError('File too large. Maximum size is 10MB.');
      return false;
    }
    setFileError(null);
    return true;
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file && validateFile(file)) {
      setSelectedFile(file);
      setUploadResult(null);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && validateFile(file)) {
      setSelectedFile(file);
      setUploadResult(null);
    }
  };

  const onSubmit = async (data: UploadFormData) => {
    if (!selectedFile) {
      setFileError('Please select a file');
      return;
    }

    try {
      const result = await uploadMutation.mutateAsync({
        file: selectedFile,
        siteId: data.siteId,
        statementType: data.statementType,
        year: data.year,
        month: data.month,
      });
      setUploadResult(result);
    } catch {
      // Error handled by mutation state
    }
  };

  const siteOptions = (sites || []).map((s) => ({
    value: s.id,
    label: s.name,
  }));

  const statementTypeOptions = [
    { value: 'income_statement', label: 'Income Statement' },
    { value: 'balance_sheet', label: 'Balance Sheet' },
    { value: 'cash_flow', label: 'Cash Flow Statement' },
  ];

  const yearOptions = Array.from({ length: 5 }, (_, i) => ({
    value: String(currentYear - i),
    label: String(currentYear - i),
  }));

  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1),
    label: new Date(2000, i).toLocaleString('en', { month: 'long' }),
  }));

  watch('year');
  watch('month');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Form fields */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Select
          label="Site"
          options={siteOptions}
          placeholder="Select site"
          error={errors.siteId?.message}
          {...register('siteId')}
        />
        <Select
          label="Statement Type"
          options={statementTypeOptions}
          placeholder="Select type"
          error={errors.statementType?.message}
          {...register('statementType')}
        />
        <Select
          label="Year"
          options={yearOptions}
          {...register('year', { valueAsNumber: true })}
        />
        <Select
          label="Month"
          options={monthOptions}
          {...register('month', { valueAsNumber: true })}
        />
      </div>

      {/* Drop zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'relative cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors',
          dragActive
            ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/10'
            : 'border-slate-300 hover:border-slate-400 dark:border-slate-600 dark:hover:border-slate-500',
          fileError && 'border-red-400'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_FILE_TYPES.join(',')}
          onChange={handleFileSelect}
          className="hidden"
        />
        <div className="flex flex-col items-center gap-2">
          <svg className="h-10 w-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          {selectedFile ? (
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                {selectedFile.name}
              </p>
              <p className="text-xs text-slate-500">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
          ) : (
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                <span className="font-medium text-brand-600">Click to upload</span>{' '}
                or drag and drop
              </p>
              <p className="text-xs text-slate-500 mt-1">
                XLSX, XLS, or CSV (max 10MB)
              </p>
            </div>
          )}
        </div>
      </div>

      {fileError && (
        <p className="text-sm text-red-600">{fileError}</p>
      )}

      {/* Upload progress */}
      {uploadMutation.isPending && (
        <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
          <div className="flex items-center gap-3">
            <svg className="h-5 w-5 animate-spin text-brand-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm font-medium text-brand-700 dark:text-brand-300">
              Uploading and validating...
            </span>
          </div>
        </div>
      )}

      {/* Upload results */}
      {uploadResult && (
        <Card>
          <div className="flex items-center gap-2 mb-3">
            {uploadResult.success ? (
              <Badge variant="positive">Upload Successful</Badge>
            ) : (
              <Badge variant="negative">Upload Failed</Badge>
            )}
            <span className="text-sm text-slate-500">
              {uploadResult.lineItemCount} line items processed
            </span>
          </div>

          {uploadResult.errors.length > 0 && (
            <div className="mt-3">
              <h4 className="text-sm font-medium text-red-700 mb-2">Errors</h4>
              <ul className="space-y-1">
                {uploadResult.errors.map((err, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-red-600">
                    <span className="shrink-0 mt-0.5">
                      <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </span>
                    {err.row && <span className="font-mono">Row {err.row}:</span>}
                    <span>{err.field}: {err.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {uploadResult.warnings.length > 0 && (
            <div className="mt-3">
              <h4 className="text-sm font-medium text-amber-700 mb-2">Warnings</h4>
              <ul className="space-y-1">
                {uploadResult.warnings.map((warn, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-amber-600">
                    <span className="shrink-0 mt-0.5">
                      <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </span>
                    {warn.row && <span className="font-mono">Row {warn.row}:</span>}
                    <span>{warn.field}: {warn.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      {/* Submit */}
      <div className="flex justify-end">
        <Button
          type="submit"
          loading={uploadMutation.isPending}
          disabled={!selectedFile}
        >
          Upload Statement
        </Button>
      </div>

      {uploadMutation.isError && (
        <p className="text-sm text-red-600">
          Upload failed: {uploadMutation.error instanceof Error ? uploadMutation.error.message : 'Unknown error'}
        </p>
      )}
    </form>
  );
}
