$root = (Get-Location).Path

# app folder -> list of { schemaConst, fieldName, textProp, idProp, repositoryInputType, repoCreate, repoUpdate }
$apps = @(
  @{ folder='project-charter'; appId='app-project-charter';
     fields=@(
       @{ schemaField='sponsor'; idField='sponsorId' },
       @{ schemaField='stakeholders'; idField='stakeholdersOwnerId' }
     );
     schemaConst='CharterSchema'; inputType='UpsertCharterInput'; repo='repo' },
  @{ folder='suggestion-box'; appId='app-suggestion-box';
     fields=@(@{ schemaField='author'; idField='authorId' });
     schemaConst='SuggestionSchema'; inputType='UpsertSuggestionInput'; repo='repo' },
  @{ folder='expense-reports'; appId='app-expense-reports';
     fields=@(@{ schemaField='submitter'; idField='submitterId' });
     schemaConst='ExpenseSchema'; inputType='UpsertExpenseInput'; repo='repo' },
  @{ folder='knowledge-base'; appId='app-knowledge-base';
     fields=@(@{ schemaField='author'; idField='authorId' });
     schemaConst='ArticleSchema'; inputType='UpsertArticleInput'; repo='repo' },
  @{ folder='event-rsvp'; appId='app-event-rsvp';
     fields=@(@{ schemaField='guestName'; idField='guestUserId' });
     schemaConst='RsvpSchema'; inputType='UpsertRsvpInput'; repo='repo' },
  @{ folder='time-tracking'; appId='app-time-tracking';
     fields=@(@{ schemaField='userId'; idField='userId' });
     schemaConst='EntrySchema'; inputType='UpsertTimeEntryInput'; repo='repo' }
)

foreach ($app in $apps) {
  $path = "src\apps\$($app.folder)\back-end\server.ts"
  if (-not (Test-Path -LiteralPath $path)) {
    Write-Output ("MISSING " + $path); continue
  }
  $text = [System.IO.File]::ReadAllText($path)
  if ($text -match 'labUserFieldSchema') {
    Write-Output ("SKIP already patched " + $path); continue
  }
  Write-Output ("NEEDS PATCH " + $path)
}
