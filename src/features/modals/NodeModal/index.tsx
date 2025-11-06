import React from "react";
import type { ModalProps } from "@mantine/core";
import {
  Modal,
  Stack,
  Text,
  ScrollArea,
  Flex,
  CloseButton,
  Textarea,
  Button,
  Group,
} from "@mantine/core";
import { CodeHighlight } from "@mantine/code-highlight";
import toast from "react-hot-toast";
import useFile from "../../../store/useFile";
import useJson from "../../../store/useJson";
import type { NodeData } from "../../../types/graph";
import useGraph from "../../editor/views/GraphView/stores/useGraph";

// return object from json removing array and object fields
const normalizeNodeData = (nodeRows: NodeData["text"]) => {
  if (!nodeRows || nodeRows.length === 0) return "{}";
  if (nodeRows.length === 1 && !nodeRows[0].key) return `${nodeRows[0].value}`;

  const obj = {};
  nodeRows?.forEach(row => {
    if (row.type !== "array" && row.type !== "object") {
      if (row.key) obj[row.key] = row.value;
    }
  });
  return JSON.stringify(obj, null, 2);
};

// return json path in the format $["customer"]
const jsonPathToString = (path?: NodeData["path"]) => {
  if (!path || path.length === 0) return "$";
  const segments = path.map(seg => (typeof seg === "number" ? seg : `"${seg}"`));
  return `$[${segments.join("][")}]`;
};

// Update JSON at a specific path
const updateJsonAtPath = (jsonObj: any, path: NodeData["path"], newValue: any): any => {
  if (!path || path.length === 0) {
    // Root level update
    return newValue;
  }

  const updatedObj = JSON.parse(JSON.stringify(jsonObj)); // Deep clone
  let current = updatedObj;

  // Navigate to the parent of the target
  for (let i = 0; i < path.length - 1; i++) {
    current = current[path[i]];
  }

  // Update the final property
  const lastKey = path[path.length - 1];
  current[lastKey] = newValue;

  return updatedObj;
};

export const NodeModal = ({ opened, onClose }: ModalProps) => {
  const nodeData = useGraph(state => state.selectedNode);
  const getJson = useJson(state => state.getJson);
  const setContents = useFile(state => state.setContents);

  const [isEditing, setIsEditing] = React.useState(false);
  const [editedValue, setEditedValue] = React.useState("");

  React.useEffect(() => {
    if (opened && nodeData) {
      setEditedValue(normalizeNodeData(nodeData.text ?? []));
      setIsEditing(false);
    }
  }, [opened, nodeData]);

  const handleSave = () => {
    try {
      // Parse the edited value
      const parsedValue = JSON.parse(editedValue);

      // Get current JSON
      const currentJson = JSON.parse(getJson());

      // Update JSON at the node's path
      const updatedJson = updateJsonAtPath(currentJson, nodeData?.path, parsedValue);

      // Update the file contents
      setContents({ contents: JSON.stringify(updatedJson, null, 2) });

      toast.success("Node updated successfully!");
      setIsEditing(false);
      onClose();
    } catch (error) {
      toast.error("Invalid JSON format");
    }
  };

  const handleCancel = () => {
    setEditedValue(normalizeNodeData(nodeData?.text ?? []));
    setIsEditing(false);
  };

  return (
    <Modal size="auto" opened={opened} onClose={onClose} centered withCloseButton={false}>
      <Stack pb="sm" gap="sm">
        <Stack gap="xs">
          <Flex justify="space-between" align="center">
            <Text fz="xs" fw={500}>
              Content
            </Text>
            <Group justify="left">
              {isEditing ? (
                <>
                  <Button variant="default" size="xs" onClick={handleCancel}>
                    Cancel
                  </Button>
                  <Button size="xs" onClick={handleSave}>
                    Save
                  </Button>
                </>
              ) : (
                <Button justify="left" size="xs" onClick={() => setIsEditing(true)}>
                  Edit
                </Button>
              )}
            </Group>
            <CloseButton onClick={onClose} />
          </Flex>
          {isEditing ? (
            <Textarea
              value={editedValue}
              onChange={e => setEditedValue(e.currentTarget.value)}
              minRows={6}
              maxRows={12}
              autosize
              styles={{
                input: {
                  fontFamily: "monospace",
                  fontSize: "12px",
                  minWidth: "350px",
                  maxWidth: "600px",
                },
              }}
            />
          ) : (
            <ScrollArea.Autosize mah={250} maw={600}>
              <CodeHighlight
                code={normalizeNodeData(nodeData?.text ?? [])}
                miw={350}
                maw={600}
                language="json"
                withCopyButton
              />
            </ScrollArea.Autosize>
          )}
        </Stack>
        <Text fz="xs" fw={500}>
          JSON Path
        </Text>
        <ScrollArea.Autosize maw={600}>
          <CodeHighlight
            code={jsonPathToString(nodeData?.path)}
            miw={350}
            mah={250}
            language="json"
            copyLabel="Copy to clipboard"
            copiedLabel="Copied to clipboard"
            withCopyButton
          />
        </ScrollArea.Autosize>
      </Stack>
    </Modal>
  );
};
