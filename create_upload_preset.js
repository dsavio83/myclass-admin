import { v2 as cloudinary } from 'cloudinary';

// Configuration
cloudinary.config({
    cloud_name: 'learning-platform-25',
    api_key: '738446394155494',
    api_secret: 'Gy6i_qU4LkvIjbeUDDBllIgE80Q'
});

const PRESET_NAME = 'learning_platform_unsigned';

async function createPreset() {
    try {
        console.log(`Checking/Creating upload preset: ${PRESET_NAME}...`);

        // Try to get the preset first to see if it exists
        try {
            await cloudinary.api.upload_preset(PRESET_NAME);
            console.log(`Preset '${PRESET_NAME}' already exists.`);
        } catch (error) {
            if (error.error && error.error.http_code === 404) {
                // Create if not exists
                console.log("Preset not found. Creating...");
                await cloudinary.api.create_upload_preset({
                    name: PRESET_NAME,
                    unsigned: true,
                    folder: "class_content",
                    allowed_formats: "jpg,png,pdf,mp4,mp3,doc,docx",
                });
                console.log(`Preset '${PRESET_NAME}' created successfully!`);
            } else {
                throw error;
            }
        }

    } catch (error) {
        console.error('Error managing upload preset:', error);
    }
}

createPreset();
