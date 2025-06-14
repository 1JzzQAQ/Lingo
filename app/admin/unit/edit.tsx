import { Edit, NumberInput, ReferenceInput, required, SimpleForm, TextInput } from "react-admin";

export const UnitEidt = () =>{
    return (
        <Edit>
            <SimpleForm>
                <TextInput source="id" validate={[required()]} label="id" />
                <TextInput source="title" validate={[required()]} label="Title" />
                <TextInput source="description" validate={[required()]} label="Description" />
                <ReferenceInput source="courseId" reference="courses" />
                <NumberInput source="order" validate={[required()]} label="Order" />
            </SimpleForm>
        </Edit>
    )
}