class ApiResponse{
    constructor(
        statuscode,
        data,
        message = 'successful'
    ){
        this.statusCode = statuscode;
        this.data = data;
        this.message = message;
        this.success = true;
    }
}

export { ApiResponse };