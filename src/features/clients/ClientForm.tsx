import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import {
  SheetRoot,
  SheetContent,
  SheetClose,
} from '@shared/ui/Sheet';
import { Input, Textarea } from '@shared/ui/Field';
import { Button } from '@shared/ui/Button';
import { useToast } from '@shared/hooks/use-toast';

import {
  ClientSchema,
  type Client,
  type ClientInput,
  useCreateClient,
  useUpdateClient,
} from './clients';

interface ClientFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided, the form is in edit mode. */
  client?: Client | null;
}

const EMPTY_DEFAULTS: ClientInput = {
  name: '',
  email: '',
  phone: '',
  address: '',
  description: '',
};

export function ClientForm({ open, onOpenChange, client }: ClientFormProps) {
  const isEdit = !!client;
  const createMut = useCreateClient();
  const updateMut = useUpdateClient();
  const { push } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ClientInput>({
    resolver: zodResolver(ClientSchema),
    defaultValues: EMPTY_DEFAULTS,
  });

  useEffect(() => {
    if (open) {
      reset(
        client
          ? {
              name: client.name,
              email: client.email ?? '',
              phone: client.phone ?? '',
              address: client.address ?? '',
              description: client.description ?? '',
            }
          : EMPTY_DEFAULTS,
      );
    }
  }, [open, client, reset]);

  const onSubmit = handleSubmit(async (values) => {
    const cleaned: ClientInput = {
      name: values.name.trim(),
      email: values.email?.trim() || undefined,
      phone: values.phone?.trim() || undefined,
      address: values.address?.trim() || undefined,
      description: values.description?.trim() || undefined,
    };

    try {
      if (isEdit && client) {
        await updateMut.mutateAsync({ id: client.id, input: cleaned });
        push({ tone: 'positive', title: 'Client updated.' });
      } else {
        await createMut.mutateAsync(cleaned);
        push({ tone: 'positive', title: 'Client added.' });
      }
      onOpenChange(false);
    } catch {
      push({
        tone: 'danger',
        title: isEdit
          ? 'Couldn’t save changes. Try again.'
          : 'Couldn’t add client. Try again.',
      });
    }
  });

  return (
    <SheetRoot open={open} onOpenChange={onOpenChange}>
      <SheetContent
        title={isEdit ? 'Edit client' : 'New client'}
        description={
          isEdit
            ? 'Update contact details and notes.'
            : 'Someone you ship to. Only the name is required — fill the rest as you go.'
        }
        footer={
          <>
            <SheetClose asChild>
              <Button type="button" variant="ghost" size="md">
                Cancel
              </Button>
            </SheetClose>
            <Button
              type="submit"
              form="client-form"
              size="md"
              isLoading={isSubmitting}
            >
              {isEdit ? 'Save changes' : 'Add client'}
            </Button>
          </>
        }
      >
        <form
          id="client-form"
          onSubmit={(e) => void onSubmit(e)}
          className="space-y-6"
          noValidate
        >
          <Input
            label="Name"
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            {...register('name')}
            error={errors.name?.message}
          />
          <Input
            label="Email"
            type="email"
            optional
            autoComplete="email"
            {...register('email')}
            error={errors.email?.message}
          />
          <Input
            label="Phone"
            type="tel"
            optional
            autoComplete="tel"
            {...register('phone')}
            error={errors.phone?.message}
          />
          <Input
            label="Address"
            optional
            autoComplete="street-address"
            {...register('address')}
            error={errors.address?.message}
          />
          <Textarea
            label="Notes"
            optional
            rows={3}
            hint="Anything worth remembering — delivery cadence, preferences, contacts."
            {...register('description')}
            error={errors.description?.message}
          />
        </form>
      </SheetContent>
    </SheetRoot>
  );
}
