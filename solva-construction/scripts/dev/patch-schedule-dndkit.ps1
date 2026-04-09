$ErrorActionPreference = "Stop"

$p = "src/components/schedule/ScheduleTableDnd.tsx"
$t = Get-Content $p -Raw

# Replace native HTML5 DnD state with dnd-kit activeId
$t = $t -replace 'const \[draggingTaskId, setDraggingTaskId\] = useState<string \| null>\(null\);\r?\n\s*const \[dragOverTaskId, setDragOverTaskId\] = useState<string \| null>\(null\);', 'const [activeId, setActiveId] = useState<string | null>(null);'

# Drop now-unused native drop handlers (dnd-kit handles reorder on drag end)
$t = [regex]::Replace(
  $t,
  '(?s)\n\s*const handleDropOnTask\s*=\s*\([\s\S]*?\n\s*\};\s*\n\s*const handleDropOnSection\s*=\s*\([\s\S]*?\n\s*\};\s*',
  "\n"
)

# Insert dnd-kit sensors + handler after affectedIds
$needle = "  const affectedIds = cascadeNotification?.affectedIds || [];"
if (-not $t.Contains($needle)) {
  throw "Could not find affectedIds line to insert dnd-kit handlers."
}

$insert = @"
$needle

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const visibleTaskIds = useMemo(
    () =>
      sectionGroups.flatMap(({ section, tasks: sectionTasks }) =>
        collapsedSections.has(section.id) ? [] : sectionTasks.map((t) => t.id),
      ),
    [sectionGroups, collapsedSections],
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const active = event.active?.id ? String(event.active.id) : null;
    const over = event.over?.id ? String(event.over.id) : null;

    setActiveId(null);

    if (!active || !over || active === over) return;

    const instruction = getReorderInstruction({
      activeId: active,
      overId: over,
      tasks,
    });

    if (!instruction) return;

    reorderTask(
      instruction.sourceTaskId,
      instruction.targetTaskId,
      instruction.targetSectionId,
    );
  };
"@

$t = $t.Replace($needle, $insert)

# Wrap return with DndContext (insert right before overflow-x-auto wrapper)
$openNeedle = '  return (' + "`r`n" + '    <div className="overflow-x-auto">'
$openIdx = $t.IndexOf($openNeedle)
if ($openIdx -lt 0) {
  throw "Could not find return block start to wrap with DndContext."
}

$openReplacement = '  return (' + "`r`n" +
  '    <DndContext' + "`r`n" +
  '      sensors={sensors}' + "`r`n" +
  '      collisionDetection={closestCenter}' + "`r`n" +
  '      onDragStart={handleDragStart}' + "`r`n" +
  '      onDragEnd={handleDragEnd}' + "`r`n" +
  '    >' + "`r`n" +
  '      <div className="overflow-x-auto">'

$t = $t.Replace($openNeedle, $openReplacement)

# Add SortableContext inside tbody
$t = $t.Replace(
  "        <tbody>",
  "        <tbody>`r`n          <SortableContext items={visibleTaskIds} strategy={verticalListSortingStrategy}>"
)
$t = $t.Replace(
  "        </tbody>",
  "          </SortableContext>`r`n        </tbody>"
)

# Close DndContext right before return closes (last occurrence)
$closeNeedle = "    </div>`r`n  );"
$closeIdx = $t.LastIndexOf($closeNeedle)
if ($closeIdx -lt 0) {
  throw "Could not find return block end to close DndContext."
}

$closeReplacement = "      </div>`r`n    </DndContext>`r`n  );"
$t = $t.Substring(0, $closeIdx) + $closeReplacement + $t.Substring($closeIdx + $closeNeedle.Length)

Set-Content -Path $p -Value $t -Encoding UTF8
Write-Host "Patched $p"
