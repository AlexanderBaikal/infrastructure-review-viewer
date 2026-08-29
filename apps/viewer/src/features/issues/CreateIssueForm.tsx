import { useState, type FormEvent } from 'react';
import { SEVERITIES, type IssueDraft, type IssueValidationError, type Severity } from '@irv/review-core';

interface CreateIssueFormProps {
  element: { id: string; name: string };
  onCreate: (draft: IssueDraft) => IssueValidationError[] | null;
}

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

export function CreateIssueForm({ element, onCreate }: CreateIssueFormProps) {
  const [title, setTitle] = useState('');
  const [severity, setSeverity] = useState<Severity>('medium');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<IssueValidationError[]>([]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const result = onCreate({ title, severity, description });
    if (result && result.length > 0) {
      setErrors(result);
      return;
    }
    setErrors([]);
    setTitle('');
    setDescription('');
    setSeverity('medium');
  };

  const invalid = (field: IssueValidationError['field']) => errors.some((error) => error.field === field);

  return (
    <form className="issue-form" onSubmit={submit} noValidate aria-label={`New issue on ${element.name}`}>
      <h3 className="issue-form__title">
        New issue <span className="issue-form__target">on {element.name}</span>
      </h3>
      <label className="field">
        <span>Title</span>
        <input
          data-testid="issue-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="What needs attention?"
          aria-invalid={invalid('title')}
          autoComplete="off"
        />
      </label>
      <label className="field">
        <span>Severity</span>
        <select
          data-testid="issue-severity"
          value={severity}
          onChange={(event) => setSeverity(event.target.value as Severity)}
        >
          {SEVERITIES.map((option) => (
            <option key={option} value={option}>
              {capitalize(option)}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Description</span>
        <textarea
          data-testid="issue-description"
          rows={3}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Optional details for the designer"
        />
      </label>
      {errors.length > 0 && (
        <ul className="form-errors" role="alert">
          {errors.map((error) => (
            <li key={error.field}>{error.message}</li>
          ))}
        </ul>
      )}
      <button type="submit" className="btn btn--primary" data-testid="create-issue">
        Create issue
      </button>
    </form>
  );
}
