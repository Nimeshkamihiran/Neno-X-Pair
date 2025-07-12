const mega = require("megajs");

const auth = {
  email: "nimeshmihiranga183@gmail.com",
  password: "Nimesh@123",
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
};

const upload = (data, name) => {
  return new Promise((resolve, reject) => {
    const storage = new mega.Storage(auth);

    // Set timeout for the entire operation
    const timeout = setTimeout(() => {
      storage.close();
      reject(new Error('Upload timeout - operation took too long'));
    }, 60000); // 60 seconds timeout

    storage.on("ready", () => {
      console.log("Storage is ready. Proceeding with upload.");

      try {
        const uploadStream = storage.upload({ 
          name, 
          allowUploadBuffering: true,
          size: data.length || undefined // Add size if available
        });

        uploadStream.on("complete", (file) => {
          clearTimeout(timeout);
          
          file.link((err, url) => {
            if (err) {
              console.error("Error generating link:", err);
              storage.close();
              reject(err);
            } else {
              console.log("Upload successful:", url);
              storage.close();
              resolve(url);
            }
          });
        });

        uploadStream.on("error", (err) => {
          clearTimeout(timeout);
          console.error("Upload stream error:", err);
          storage.close();
          reject(err);
        });

        uploadStream.on("progress", (stats) => {
          console.log(`Upload progress: ${Math.round(stats.percentage)}%`);
        });

        // Handle different data types
        if (data.pipe) {
          // Stream data
          data.pipe(uploadStream);
        } else if (Buffer.isBuffer(data)) {
          // Buffer data
          uploadStream.write(data);
          uploadStream.end();
        } else {
          // String or other data
          uploadStream.write(Buffer.from(data));
          uploadStream.end();
        }

      } catch (error) {
        clearTimeout(timeout);
        console.error("Error creating upload stream:", error);
        storage.close();
        reject(error);
      }
    });

    storage.on("error", (err) => {
      clearTimeout(timeout);
      console.error("Storage error:", err);
      storage.close();
      reject(err);
    });

    // Handle connection timeout
    storage.on("timeout", () => {
      clearTimeout(timeout);
      console.error("Storage connection timeout");
      storage.close();
      reject(new Error('Storage connection timeout'));
    });
  });
};

// Alternative upload function with retry logic
const uploadWithRetry = async (data, name, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      console.log(`Upload attempt ${i + 1}/${maxRetries}`);
      const result = await upload(data, name);
      return result;
    } catch (error) {
      console.error(`Upload attempt ${i + 1} failed:`, error.message);
      
      if (i === maxRetries - 1) {
        throw error; // Last attempt failed
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
    }
  }
};

module.exports = { upload, uploadWithRetry };
